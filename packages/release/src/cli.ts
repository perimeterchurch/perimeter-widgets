import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setManifestVersion, buildRewrites, versionsToPrune, type Manifest } from './release';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CDN = path.join(REPO, 'cdn');
const KEEP = 5;

function readJson<T>(p: string): T {
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}
function writeJson(p: string, v: unknown): void {
  writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
}

function main(): void {
  const name = process.argv[2];
  const force = process.argv.includes('--force');
  if (!name) throw new Error('usage: pnpm release <widget-name> [--force]');

  const widgetDir = path.join(REPO, 'widgets', name);
  if (!existsSync(widgetDir)) throw new Error(`unknown widget: widgets/${name} not found`);
  const version = readJson<{ version?: string }>(path.join(widgetDir, 'package.json')).version;
  if (!version) throw new Error(`widgets/${name}/package.json has no version`);

  const destDir = path.join(CDN, name, version);
  if (existsSync(destDir) && !force) {
    throw new Error(
      `${name}@${version} already published (immutable). Bump the version or pass --force.`,
    );
  }

  // Build the widget.
  execSync(`pnpm --filter @perimeter/widget-${name} build`, { cwd: REPO, stdio: 'inherit' });

  // Copy the immutable artifact + sourcemap.
  const dist = path.join(widgetDir, 'dist');
  mkdirSync(destDir, { recursive: true });
  copyFileSync(path.join(dist, 'index.js'), path.join(destDir, 'index.js'));
  copyFileSync(path.join(dist, 'index.js.map'), path.join(destDir, 'index.js.map'));

  // Update the manifest pointer.
  const manifestPath = path.join(CDN, 'manifest.json');
  const manifest = setManifestVersion(readJson<Manifest>(manifestPath), name, version);
  writeJson(manifestPath, manifest);

  // Regenerate the latest-rewrites in vercel.json from the manifest (headers untouched).
  const vercelPath = path.join(CDN, 'vercel.json');
  const vercel = readJson<{ rewrites: unknown[]; headers: unknown[] }>(vercelPath);
  vercel.rewrites = buildRewrites(manifest);
  writeJson(vercelPath, vercel);

  // Prune old versions of THIS widget to the last KEEP.
  const widgetCdnDir = path.join(CDN, name);
  const versions = readdirSync(widgetCdnDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const old of versionsToPrune(versions, KEEP)) {
    rmSync(path.join(widgetCdnDir, old), { recursive: true, force: true });
  }

  // Commit (do not push / open PR — that's a human step).
  execSync(`git add ${JSON.stringify(CDN)}`, { cwd: REPO, stdio: 'inherit' });
  execSync(`git commit -m ${JSON.stringify(`chore(release): ${name}@${version}`)}`, {
    cwd: REPO,
    stdio: 'inherit',
  });

  console.log(`\nReleased ${name}@${version} → cdn/${name}/${version}/index.js`);
  console.log('manifest + latest rewrite updated. Next: push the branch and open a PR into dev.');
}

main();
