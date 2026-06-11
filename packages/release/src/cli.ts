import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  cpSync,
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
  versionAdvances,
  isProtectedBranch,
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

  // Copy dist/ wholesale: the bundle + sourcemap plus any sibling artifacts a
  // widget's build emits (e.g. sermons' pdf.worker.min.mjs). Everything in the
  // version dir is equally immutable and already covered by the
  // /:name/:version/:file* cache/CORS headers.
  const dist = path.join(widgetDir, 'dist');
  const destDir = path.join(CDN, name, version);
  mkdirSync(destDir, { recursive: true });
  cpSync(dist, destDir, { recursive: true });

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

function gitCapture(cmd: string): string {
  return execSync(`git ${cmd}`, { cwd: REPO, encoding: 'utf8' }).trim();
}

function assertCleanTree(context: string): void {
  const dirty = gitCapture('status --porcelain');
  if (dirty) {
    throw new Error(
      `working tree is not clean — commit or stash changes before ${context}.\n${dirty}`,
    );
  }
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
      const dryRunBranch = gitCapture('rev-parse --abbrev-ref HEAD');
      if (isProtectedBranch(dryRunBranch))
        console.log(
          `[dry-run] note: currently on '${dryRunBranch}' — a real run refuses to commit here; switch to a feature branch first`,
        );
      return;
    }
    // Guards (audit #46): never commit a release on a protected branch, and
    // never sweep unrelated changes into the release commit via `git add cdn`.
    const branch = gitCapture('rev-parse --abbrev-ref HEAD');
    if (isProtectedBranch(branch)) {
      throw new Error(
        `refusing to commit a release on '${branch}' — create a feature branch first ` +
          `(the repo never takes direct commits on dev/main).`,
      );
    }
    assertCleanTree('a no-bump release');

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

  // ── With a bump. ──
  if (dryRun) {
    // The dry-run plan is computed from the LOCAL checkout (no fetch); a real
    // run re-derives the version from origin/dev, so the numbers can differ
    // when the local checkout is behind.
    const plan = planRelease(name, currentVersion, bump);
    console.log(`[dry-run] release ${name}: ${currentVersion} → ${plan.newVersion} (${bump})`);
    console.log(`[dry-run] branch:  ${plan.branch}`);
    console.log(`[dry-run] commit:  ${plan.commitMessage}`);
    console.log(`[dry-run] pr title: ${plan.prTitle}`);
    console.log(`[dry-run] pr body:\n${plan.prBody}`);
    console.log('\n[dry-run] no branch, no file writes, no build, no git, no push, no gh.');
    return;
  }

  // Guard: clean working tree, then sync with origin.
  assertCleanTree('a bump release');
  git('fetch origin');

  // Plan from the version on origin/dev — the branch the release is actually
  // cut from. Planning from the local package.json (audit #15) publishes an
  // old version when the checkout is behind and moves the manifest pointer
  // BACKWARD, silently downgrading every embed via /<name>/latest.js.
  const devPkg = JSON.parse(gitCapture(`show origin/dev:widgets/${name}/package.json`)) as {
    version?: string;
  };
  const devVersion = devPkg.version;
  if (!devVersion) throw new Error(`widgets/${name}/package.json on origin/dev has no version`);
  const plan = planRelease(name, devVersion, bump);

  // Branch off origin/dev.
  git(`checkout -b ${JSON.stringify(plan.branch)} origin/dev`);

  // Write the bumped version into the widget's package.json, re-read from the
  // freshly checked-out tree — spreading a pre-checkout copy would silently
  // revert dependency/script changes that landed on dev.
  const freshPkg = readJson<Record<string, unknown>>(pkgPath);
  writeJson(pkgPath, { ...freshPkg, version: plan.newVersion });

  // Install against origin/dev's lockfile so the bundle is not built with
  // whatever node_modules the previous checkout left behind.
  execSync('pnpm install --frozen-lockfile', { cwd: REPO, stdio: 'inherit' });

  // Monotonicity + immutability guards: the manifest pointer drives
  // /<name>/latest.js and must never move backward (or onto a reused dir).
  const manifest = readJson<Manifest>(path.join(CDN, 'manifest.json'));
  if (!versionAdvances(manifest, name, plan.newVersion)) {
    throw new Error(
      `computed version ${plan.newVersion} does not advance the manifest pointer ` +
        `(${name}@${manifest[name]}) — releasing would downgrade every embed.`,
    );
  }
  if (existsSync(path.join(CDN, name, plan.newVersion))) {
    throw new Error(`${name}@${plan.newVersion} already exists in cdn/ (immutable).`);
  }

  // Run the shared core (build → copy → manifest → rewrites → prune).
  const gzBytes = publishToCdn(name, plan.newVersion, widgetDir);

  // Stage + commit the cdn changes and the version bump.
  git(`add ${JSON.stringify(CDN)} ${JSON.stringify(pkgPath)}`);
  git(`commit -m ${JSON.stringify(plan.commitMessage)}`);

  // Push and open the PR into dev. Recompute the body with the real bundle size.
  git(`push -u origin ${JSON.stringify(plan.branch)}`);
  const body = planRelease(name, devVersion, bump, gzBytes).prBody;
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
