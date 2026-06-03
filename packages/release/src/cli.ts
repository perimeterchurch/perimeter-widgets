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
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import {
  setManifestVersion,
  buildRewrites,
  versionsToPrune,
  parseReleaseArgs,
  planRelease,
  type Manifest,
} from './release';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CDN = path.join(REPO, 'cdn');
const KEEP = 5;

function readJson<T>(p: string): T {
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}
function writeJson(p: string, v: unknown): void {
  writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
}

/**
 * Shared side-effecting core (unchanged from the original flow): build the widget, copy the
 * immutable bundle into cdn/<name>/<version>/, update the manifest pointer + latest-rewrites,
 * prune to the last KEEP versions. Returns the built bundle's gzipped size for the PR body.
 */
function publishToCdn(name: string, version: string, widgetDir: string): number {
  // Build the widget.
  execSync(`pnpm --filter @perimeter/widget-${name} build`, { cwd: REPO, stdio: 'inherit' });

  // Copy the immutable artifact + sourcemap.
  const dist = path.join(widgetDir, 'dist');
  const destDir = path.join(CDN, name, version);
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

  return gzipSync(readFileSync(path.join(destDir, 'index.js'))).length;
}

function git(cmd: string): void {
  execSync(`git ${cmd}`, { cwd: REPO, stdio: 'inherit' });
}

function main(): void {
  const args = parseReleaseArgs(process.argv.slice(2));
  const { name, bump, force, dryRun } = args;

  const widgetDir = path.join(REPO, 'widgets', name);
  if (!existsSync(widgetDir)) throw new Error(`unknown widget: widgets/${name} not found`);
  const pkgPath = path.join(widgetDir, 'package.json');
  const pkg = readJson<{ version?: string }>(pkgPath);
  const currentVersion = pkg.version;
  if (!currentVersion) throw new Error(`widgets/${name}/package.json has no version`);

  // ── No bump: today's behavior, unchanged. Version as-is; commit; no push, no PR. ──
  if (!bump) {
    if (dryRun) {
      const destDir = path.join(CDN, name, currentVersion);
      console.log(`[dry-run] would release ${name}@${currentVersion} (version as-is)`);
      console.log(
        `[dry-run] would build, copy to cdn/${name}/${currentVersion}/, update manifest + rewrites, prune to ${KEEP}`,
      );
      console.log(
        `[dry-run] would commit "chore(release): ${name}@${currentVersion}" on the current branch (no push, no PR)`,
      );
      if (existsSync(destDir))
        console.log(
          `[dry-run] note: ${name}@${currentVersion} already published — a real run needs --force`,
        );
      return;
    }
    const destDir = path.join(CDN, name, currentVersion);
    if (existsSync(destDir) && !force) {
      throw new Error(
        `${name}@${currentVersion} already published (immutable). Bump the version or pass --force.`,
      );
    }
    publishToCdn(name, currentVersion, widgetDir);
    git(`add ${JSON.stringify(CDN)}`);
    git(`commit -m ${JSON.stringify(`chore(release): ${name}@${currentVersion}`)}`);
    console.log(`\nReleased ${name}@${currentVersion} → cdn/${name}/${currentVersion}/index.js`);
    console.log('manifest + latest rewrite updated. Next: push the branch and open a PR into dev.');
    return;
  }

  // ── With a bump: compute the plan up front (pure). ──
  const plan = planRelease(name, currentVersion, bump);

  if (dryRun) {
    console.log(`[dry-run] release ${name}: ${currentVersion} → ${plan.newVersion} (${bump})`);
    console.log(`[dry-run] branch:  ${plan.branch}`);
    console.log(`[dry-run] commit:  ${plan.commitMessage}`);
    console.log(`[dry-run] pr title: ${plan.prTitle}`);
    console.log(`[dry-run] pr body:\n${plan.prBody}`);
    console.log('\n[dry-run] no branch, no file writes, no build, no git, no push, no gh.');
    return;
  }

  // Guard: clean working tree, then sync with origin.
  const dirty = execSync('git status --porcelain', { cwd: REPO, encoding: 'utf8' }).trim();
  if (dirty) {
    throw new Error(
      'working tree is not clean — commit or stash changes before a bump release.\n' + dirty,
    );
  }
  git('fetch origin');

  // Branch off origin/dev.
  git(`checkout -b ${JSON.stringify(plan.branch)} origin/dev`);

  // Write the bumped version into the widget's package.json.
  writeJson(pkgPath, { ...pkg, version: plan.newVersion });

  // Run the shared core (build → copy → manifest → rewrites → prune).
  const gzBytes = publishToCdn(name, plan.newVersion, widgetDir);

  // Stage + commit the cdn changes and the version bump.
  git(`add ${JSON.stringify(CDN)} ${JSON.stringify(pkgPath)}`);
  git(`commit -m ${JSON.stringify(plan.commitMessage)}`);

  // Push and open the PR into dev. Recompute the body with the real bundle size.
  git(`push -u origin ${JSON.stringify(plan.branch)}`);
  const body = planRelease(name, currentVersion, bump, gzBytes).prBody;
  const bodyFile = path.join(os.tmpdir(), `release-${name}-${plan.newVersion}.md`);
  writeFileSync(bodyFile, body);
  execSync(
    `gh pr create --base dev --head ${JSON.stringify(plan.branch)} --title ${JSON.stringify(
      plan.prTitle,
    )} --body-file ${JSON.stringify(bodyFile)}`,
    { cwd: REPO, stdio: 'inherit' },
  );
  rmSync(bodyFile, { force: true });

  console.log(`\nReleased ${name}@${plan.newVersion} on ${plan.branch} and opened a PR into dev.`);
}

main();
