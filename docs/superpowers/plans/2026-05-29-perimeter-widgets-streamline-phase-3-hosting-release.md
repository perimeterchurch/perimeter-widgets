# Perimeter Widgets Streamline — Phase 3 (Hosting + Release) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the static `cdn/` hosting story and a `pnpm release <name>` CLI so a widget can be built to an immutable versioned URL, pointed at by a mutable `manifest.json`, and promoted/rolled back through git — with no database, no Blob, no admin UI. Plus a minimal global `loader.js`. **No actual Vercel deploy or DNS is performed by this plan** — that's a documented manual step; this plan produces and verifies all the code/artifacts and the release workflow locally.

**Architecture:** `cdn/` is a plain static directory (committed bundles) deployed as its own Vercel static project at `widgets.perimeter.org`. Layout: `cdn/<name>/<version>/index.js` (+ `.map`), immutable; `cdn/manifest.json` (`{ name: version }`), the single mutable pointer; `cdn/vercel.json` (cache headers + CORS + per-widget `/<name>/latest.js` → `/<name>/<version>/index.js` rewrites, the rewrites regenerated from the manifest on each release); `cdn/loader.js` (reads the manifest, scans `[data-perimeter-widget]`, lazy-loads + dedupes used bundles). Release tooling lives in a small, testable `@perimeter/release` workspace package; `pnpm release <name>` builds the widget, copies the artifact to the immutable path, updates the manifest + the `latest` rewrites, prunes to the last 5 versions, and commits. Promote = the manifest change in a PR; rollback = revert that commit or Vercel Instant Rollback.

**Tech Stack:** Node 22 + `tsx`, Vitest (node env), Vite (widget builds), Vercel static `vercel.json` (rewrites + headers). No new runtime deps in shipped widgets.

**Spec:** `docs/superpowers/specs/2026-05-29-perimeter-widgets-streamline-redesign-design.md` (Hosting + release).
**Depends on:** Phases 1 + 2 (merged to `dev`). Widgets build to `widgets/<name>/dist/index.js` (+ `.map`) via `widgetConfig`.

---

## Key decisions locked for this plan

1. **Execution branch:** `feat/widgets-streamline-hosting`, from `origin/dev`. Never commit to `dev`/`main`; land via PR.
2. **Release tooling = a workspace package `@perimeter/release`** (not a loose root script) so its logic is unit-tested in the same turbo `quality` gate as everything else. Pure, side-effect-free helpers in `src/release.ts`; the thin imperative CLI in `src/cli.ts`. Root `package.json` gets `"release": "tsx packages/release/src/cli.ts"` so `pnpm release <name>` works.
3. **`vercel.json` ownership:** the **headers** block is authored once (static); the **rewrites** array is **regenerated from `manifest.json`** by the release CLI on every release (deterministic — one `/<name>/latest.js` → current-version rewrite per manifest entry). This keeps `latest.js` working on a static deploy without duplicating bundle bytes.
4. **Bundles are committed** (spec decision #12). Each release copies `widgets/<name>/dist/index.js` + `.map` to `cdn/<name>/<version>/`. Versioned paths are **immutable** — the CLI refuses to overwrite an existing version dir unless `--force`. The CLI **prunes to the last 5 versions** per widget (semver-ordered) so the repo doesn't grow unbounded.
5. **`loader.js` is included** (the spec's hosting section describes it) but kept minimal: fetch `manifest.json`, scan `[data-perimeter-widget="<name>"]`, inject the **immutable versioned** bundle URL once per distinct name (dedupe), guard against double-load. The async stub-and-queue refinement is noted as a future nicety, not built here.
6. **No deploy in this plan.** The plan produces `cdn/` + the CLI + the first committed releases for `example` and `sermons`, verifies the release flow and a local static load, and **stops**. Creating the Vercel project, attaching `widgets.perimeter.org`, and the production deploy are a documented manual step in the hosting doc + PR body (they need the user's Vercel account). Phase 4 (WordPress cutover) is separate.
7. **Cache headers (spec values):** versioned `…/index.js(.map)` → `public, max-age=31536000, immutable`; `manifest.json` and `…/latest.js` → `public, max-age=0, s-maxage=60, stale-while-revalidate=86400`; `Access-Control-Allow-Origin: *` on all bundle/manifest/loader responses (they load cross-origin from WordPress).
8. **Test convention** (unchanged): the `@perimeter/release` package keeps tests in `tests/` importing `../src/…`, with a `vitest.config.ts` (`environment: 'node'`, `include: ['tests/**/*.test.ts']`), matching `@perimeter/api-client`/`theme`.

---

## File structure (end state of Phase 3)

```
perimeter-widgets/
├── package.json                      # MODIFY: add "release": "tsx packages/release/src/cli.ts"
├── packages/release/                 # NEW workspace package @perimeter/release
│   ├── package.json, tsconfig.json, vitest.config.ts
│   ├── src/
│   │   ├── release.ts                # pure helpers (manifest, paths, prune, rewrites)
│   │   └── cli.ts                    # imperative entry: build → copy → manifest → rewrites → prune → commit
│   └── tests/release.test.ts
└── cdn/                              # NEW static dir (committed bundles + pointers), deployed separately
    ├── vercel.json                   # headers (static) + rewrites (regenerated from manifest)
    ├── manifest.json                 # { "example": "0.0.0", "sermons": "1.0.0" }
    ├── loader.js                     # global loader (manifest-driven, dedup)
    ├── README.md                     # how cdn/ is deployed (manual Vercel step)
    ├── example/<version>/index.js(.map)
    └── sermons/<version>/index.js(.map)
```

The release package is dev-only tooling; nothing here ships inside a widget bundle.

---

## Chunk 1: The `@perimeter/release` package — pure helpers (TDD)

### Task 1.1: Scaffold the package

**Files:**
- Create: `packages/release/package.json`, `packages/release/tsconfig.json`, `packages/release/vitest.config.ts`

- [ ] **Step 1: Branch.** `git fetch origin --prune && git checkout -b feat/widgets-streamline-hosting origin/dev`.
- [ ] **Step 2:** `packages/release/package.json`:

```json
{
  "name": "@perimeter/release",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "lint": "eslint src tests",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "typescript": "^5.7.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 3:** `packages/release/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": ".", "noEmit": true },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 4:** `packages/release/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
```

- [ ] **Step 5:** `pnpm install`. Expected: `@perimeter/release` is a recognized workspace project.
- [ ] **Step 6: Commit.** `git add packages/release pnpm-lock.yaml && git commit -m "chore(release): scaffold @perimeter/release tooling package"`

### Task 1.2: Pure release helpers

**Files:**
- Create: `packages/release/src/release.ts`
- Test: `packages/release/tests/release.test.ts`

- [ ] **Step 1: Write the failing test** `packages/release/tests/release.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  setManifestVersion,
  bundleRelPath,
  versionsToPrune,
  buildRewrites,
  compareVersions,
} from '../src/release';

describe('setManifestVersion', () => {
  it('adds/updates a name → version mapping immutably', () => {
    const next = setManifestVersion({ sermons: '1.0.0' }, 'example', '0.0.0');
    expect(next).toEqual({ sermons: '1.0.0', example: '0.0.0' });
    expect(setManifestVersion(next, 'sermons', '1.1.0').sermons).toBe('1.1.0');
  });
});

describe('bundleRelPath', () => {
  it('computes the immutable cdn path for a widget version', () => {
    expect(bundleRelPath('sermons', '1.2.0')).toBe('sermons/1.2.0/index.js');
  });
});

describe('compareVersions', () => {
  it('orders semver ascending, prerelease below its release', () => {
    const sorted = ['1.2.0', '1.0.0', '1.10.0', '1.2.0-abc1234'].sort(compareVersions);
    expect(sorted).toEqual(['1.0.0', '1.2.0-abc1234', '1.2.0', '1.10.0']);
  });
});

describe('versionsToPrune', () => {
  it('keeps the newest N, returns the rest (oldest) to delete', () => {
    const all = ['1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0', '1.5.0'];
    expect(versionsToPrune(all, 5)).toEqual(['1.0.0']);
  });
  it('returns nothing when at or under the keep count', () => {
    expect(versionsToPrune(['1.0.0', '1.1.0'], 5)).toEqual([]);
  });
});

describe('buildRewrites', () => {
  it('maps each widget /<name>/latest.js to its current versioned bundle', () => {
    expect(buildRewrites({ sermons: '1.1.0', example: '0.0.0' })).toEqual([
      { source: '/example/latest.js', destination: '/example/0.0.0/index.js' },
      { source: '/sermons/latest.js', destination: '/sermons/1.1.0/index.js' },
    ]);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails.** `pnpm exec turbo run test --filter=@perimeter/release` → FAIL (module missing).

- [ ] **Step 3: Implement `packages/release/src/release.ts`:**

```ts
export type Manifest = Record<string, string>;

/** Return a new manifest with `name` pointing at `version` (input unmutated). */
export function setManifestVersion(manifest: Manifest, name: string, version: string): Manifest {
  return { ...manifest, [name]: version };
}

/** Immutable cdn-relative path for a widget bundle. */
export function bundleRelPath(name: string, version: string): string {
  return `${name}/${version}/index.js`;
}

/** Semver-ish compare; a prerelease (1.2.0-x) sorts BELOW its release (1.2.0). */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => {
    const dash = v.indexOf('-');
    const core = dash === -1 ? v : v.slice(0, dash); // always a string (no destructuring → no `| undefined`)
    const pre = dash === -1 ? null : v.slice(dash + 1);
    const nums = core.split('.').map((n) => Number.parseInt(n, 10) || 0);
    return { nums, pre };
  };
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    const d = (pa.nums[i] ?? 0) - (pb.nums[i] ?? 0);
    if (d !== 0) return d;
  }
  if (pa.pre === pb.pre) return 0;
  if (pa.pre === null) return 1; // release > prerelease
  if (pb.pre === null) return -1;
  return pa.pre < pb.pre ? -1 : 1;
}

/** Given all version strings, return the oldest ones beyond `keep` (newest kept). */
export function versionsToPrune(all: string[], keep: number): string[] {
  const sorted = [...all].sort(compareVersions); // ascending
  return sorted.slice(0, Math.max(0, sorted.length - keep));
}

export interface Rewrite {
  source: string;
  destination: string;
}

/** One `/<name>/latest.js` → current versioned bundle rewrite per manifest entry, name-sorted. */
export function buildRewrites(manifest: Manifest): Rewrite[] {
  return Object.keys(manifest)
    .sort()
    .map((name) => ({
      source: `/${name}/latest.js`,
      destination: `/${name}/${manifest[name]}/index.js`,
    }));
}
```

- [ ] **Step 4: Run the test.** `pnpm exec turbo run test --filter=@perimeter/release` → PASS.
- [ ] **Step 5: Commit.** `git add packages/release/src/release.ts packages/release/tests/release.test.ts && git commit -m "feat(release): pure helpers (manifest, paths, prune, latest rewrites)"`

---

## Chunk 2: The release CLI

### Task 2.1: `cli.ts` + wire `pnpm release`

**Files:**
- Create: `packages/release/src/cli.ts`
- Modify: `package.json` (root) — add the `release` script
- Create: `cdn/vercel.json`, `cdn/manifest.json`, `cdn/README.md` (initial empty-ish scaffolding the CLI updates)

- [ ] **Step 1: Author the static `cdn/vercel.json` headers + empty rewrites** (the CLI fills `rewrites`):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [],
  "headers": [
    {
      "source": "/:name/:version(\\d+\\.\\d+\\.\\d+(?:-[^/]+)?)/:file*",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" },
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, s-maxage=60, stale-while-revalidate=86400" },
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    },
    {
      "source": "/:name/latest.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, s-maxage=60, stale-while-revalidate=86400" },
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    },
    {
      "source": "/loader.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, s-maxage=60, stale-while-revalidate=86400" },
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```

- [ ] **Step 2: Create `cdn/manifest.json`** with `{}` and a `cdn/README.md` documenting that the dir is a standalone Vercel static project (deploy = link `cdn/` as its own project, attach `widgets.perimeter.org`, no build command) and that `manifest.json` + the `vercel.json` `rewrites` are maintained by `pnpm release`.

- [ ] **Step 3: Implement `packages/release/src/cli.ts`:**

```ts
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  setManifestVersion,
  buildRewrites,
  versionsToPrune,
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
    throw new Error(`${name}@${version} already published (immutable). Bump the version or pass --force.`);
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
```

- [ ] **Step 4: Add the root script** — in root `package.json` `scripts`, add:

```json
"release": "tsx packages/release/src/cli.ts"
```

- [ ] **Step 5: Typecheck + lint the package.** `pnpm exec turbo run typecheck lint --filter=@perimeter/release` → PASS. (The CLI's `main()` runs on import, so it is intentionally NOT imported by any test — only `release.ts` is tested.)
- [ ] **Step 6: Commit.** `git add packages/release/src/cli.ts package.json cdn/vercel.json cdn/manifest.json cdn/README.md && git commit -m "feat(release): pnpm release CLI + cdn/ scaffolding (vercel headers, manifest)"`

---

## Chunk 3: First releases (populate `cdn/`)

### Task 3.1: Release `example` and `sermons`

**Files:** generated under `cdn/` (committed by the CLI).

- [ ] **Step 1: Release example.** `pnpm release example`.
  Expected: builds; creates `cdn/example/0.0.0/index.js` (+ `.map`); `cdn/manifest.json` → `{ "example": "0.0.0" }`; `cdn/vercel.json` `rewrites` → one `/example/latest.js` entry; a `chore(release): example@0.0.0` commit. (The CLI commits itself — that is the intended release flow.)
- [ ] **Step 2: Release sermons.** `pnpm release sermons`.
  Expected: `cdn/sermons/1.0.0/index.js` (+ `.map`); manifest → adds `"sermons": "1.0.0"`; rewrites → two entries (example, sermons); a `chore(release): sermons@1.0.0` commit.
- [ ] **Step 3: Verify the artifacts + pointers.**
  Run: `cat cdn/manifest.json && cat cdn/vercel.json && ls -R cdn/example cdn/sermons`
  Expected: manifest has both widgets; vercel.json `rewrites` has both `/…/latest.js` mappings and the `headers` block is intact; each widget dir holds exactly one `<version>/index.js` + `.map`.
- [ ] **Step 4: Verify immutability guard.** Run `pnpm release example` again (no version bump).
  Expected: FAILS with "already published (immutable)". (Do not pass `--force`; this proves the guard. The failed run makes no commit.)

---

## Chunk 4: The global loader

### Task 4.1: `cdn/loader.js`

**Files:**
- Create: `cdn/loader.js`

- [ ] **Step 1: Author `cdn/loader.js`** (plain ES, served as-is — no build step):

```js
/* Perimeter Widgets global loader.
 * Usage: <script src="https://widgets.perimeter.org/loader.js" async></script>
 * Mounts every <div data-perimeter-widget="<name>"> on the page by lazy-loading
 * only the bundles actually present, each once. */
(function () {
  if (window.__perimeterLoader) return;
  window.__perimeterLoader = true;

  var origin = (document.currentScript && document.currentScript.src
    ? new URL('.', document.currentScript.src).href
    : '/');

  fetch(origin + 'manifest.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (manifest) {
      var seen = {};
      var nodes = document.querySelectorAll('[data-perimeter-widget]');
      for (var i = 0; i < nodes.length; i++) {
        var name = nodes[i].getAttribute('data-perimeter-widget');
        if (!name || seen[name]) continue;
        var version = manifest[name];
        if (!version) continue; // unknown widget — skip silently (guest on someone's page)
        seen[name] = true;
        var s = document.createElement('script');
        s.async = true;
        s.src = origin + name + '/' + version + '/index.js'; // immutable, 1yr-cached
        document.head.appendChild(s);
      }
    })
    .catch(function () { /* fail silently — never break the host page */ });
})();
```

- [ ] **Step 2: Sanity-check it parses** (no build/test harness for `cdn/`): `node --check cdn/loader.js` → no syntax error.
- [ ] **Step 3: Commit.** `git add cdn/loader.js && git commit -m "feat(cdn): manifest-driven global loader.js (lazy-load + dedupe)"`

---

## Chunk 5: Verification, quality, docs

### Task 5.1: Local static-serve smoke test

A single **self-contained** node script serves `cdn/`, fetches over HTTP, asserts, and exits — no backgrounding, no cross-call shell state (the harness resets cwd between Bash calls and blocks foreground `sleep`, so a `&` server + `kill %1` across steps would not work).

**Files:** create then delete `scripts/cdn-smoke.mjs` (throwaway).

- [ ] **Step 1: Write `scripts/cdn-smoke.mjs`** (Node 22, in-process server + global `fetch`):

```js
import http from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const CDN = path.resolve('cdn');
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0]);
  try {
    const body = readFileSync(path.join(CDN, rel));
    res.setHeader('access-control-allow-origin', '*');
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end('not found');
  }
});

await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('ok:', m); };

const manifest = await (await fetch(`${base}/manifest.json`)).json();
assert(manifest.example && manifest.sermons, 'manifest lists example + sermons');

const exRes = await fetch(`${base}/${'example'}/${manifest.example}/index.js`);
const exJs = await exRes.text();
assert(exRes.status === 200 && exJs.includes('PerimeterWidgets'), 'example bundle serves + self-mounts');

const loader = await (await fetch(`${base}/loader.js`)).text();
assert(loader.includes('data-perimeter-widget') && loader.includes('manifest.json'), 'loader scans + reads manifest');

server.close();
```

- [ ] **Step 2: Run it.** `node scripts/cdn-smoke.mjs`
  Expected: three `ok:` lines, exit 0. (This proves the files serve and the bundle/loader contents are right. `vercel.json` cache/rewrite behavior is NOT exercised by a bare server — it's validated structurally in Task 5.2 and only applies once deployed.)
- [ ] **Step 3: Clean up.** `rm scripts/cdn-smoke.mjs` (and `rmdir scripts 2>/dev/null || true` if now empty). Do not commit it.
- [ ] **Step 4 (human, deferred):** Note in the PR that the **live-browser checks are deferred to a human** (can't run headlessly): serving `cdn/` and confirming (a) a direct `<script src=".../example/0.0.0/index.js">` renders cards in a shadow root, and (b) `<script src=".../loader.js">` + `<div data-perimeter-widget="sermons">` mounts sermons.

### Task 5.2: Validate `vercel.json` structure

**Files:**
- Add a test to `packages/release/tests/release.test.ts` (or a new `tests/vercel-config.test.ts`) that reads `cdn/vercel.json` and asserts: it parses; `rewrites` equals `buildRewrites(manifest)` for the committed `cdn/manifest.json` (the CLI keeps them in sync); a header rule exists matching versioned paths with `immutable`; and a header rule matches `manifest.json` with `stale-while-revalidate`.

- [ ] **Step 1: Write the test** `packages/release/tests/vercel-config.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRewrites, type Manifest } from '../src/release';

const cdn = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../cdn');
const read = (f: string) => JSON.parse(readFileSync(path.join(cdn, f), 'utf8'));

describe('cdn/vercel.json stays in sync with the manifest', () => {
  const manifest = read('manifest.json') as Manifest;
  const vercel = read('vercel.json') as {
    rewrites: { source: string; destination: string }[];
    headers: { source: string; headers: { key: string; value: string }[] }[];
  };

  it('rewrites match buildRewrites(manifest)', () => {
    expect(vercel.rewrites).toEqual(buildRewrites(manifest));
  });
  it('versioned bundles are immutable-cached', () => {
    const all = vercel.headers.flatMap((h) => h.headers.map((x) => x.value));
    expect(all.some((v) => v.includes('immutable'))).toBe(true);
  });
  it('the manifest pointer uses stale-while-revalidate', () => {
    const m = vercel.headers.find((h) => h.source === '/manifest.json');
    expect(m?.headers.some((x) => x.value.includes('stale-while-revalidate'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run.** `pnpm exec turbo run test --filter=@perimeter/release` → PASS.
- [ ] **Step 3: Commit.** `git add packages/release/tests/vercel-config.test.ts && git commit -m "test(release): assert cdn/vercel.json stays in sync with the manifest"`

### Task 5.3: Quality gate + docs

- [ ] **Step 1: Format + gate.** `pnpm format && pnpm quality` → PASS across the workspace (now including `@perimeter/release`).
- [ ] **Step 2: Docs.** Create `docs/hosting-and-release.md`: the `cdn/` layout, `pnpm release <name>` flow, promote (merge the manifest change) / rollback (revert the commit or Vercel Instant Rollback), the immutability + last-5 prune rules, the embed snippets (direct script tag + global loader), and the **one-time manual deploy** (link `cdn/` as a standalone Vercel static project, no build command, attach `widgets.perimeter.org`). Update `perimeter-widgets/CLAUDE.md`: Phase 3 done; `pnpm release` exists; point at the hosting doc; note `cdn/` deploys separately.
- [ ] **Step 3: Commit.** `git add docs/hosting-and-release.md perimeter-widgets/CLAUDE.md && git commit -m "docs(widgets): hosting + release flow (Phase 3)"`

### Task 5.4: PR

- [ ] **Step 1:** Push `feat/widgets-streamline-hosting`; open a PR into `dev` with `--body-file` (write the body with the Write tool). Body: what shipped (`cdn/`, `pnpm release`, loader, first releases for example+sermons), the immutability + prune + manifest/rewrite model, the local verification results, and an explicit **"manual step remaining: create the Vercel static project + attach widgets.perimeter.org"** plus a note that production is unchanged (cutover is Phase 4).
- [ ] **Step 2:** Run superpowers:requesting-code-review before requesting human review.

---

## Done-when (Phase 3 acceptance)

- `pnpm quality` green across the workspace including `@perimeter/release`.
- `pnpm release <name>` builds a widget, writes the immutable `cdn/<name>/<version>/index.js` (+ `.map`), updates `cdn/manifest.json` + the `cdn/vercel.json` `latest` rewrites, prunes to the last 5 versions, and commits; re-releasing the same version without `--force` is refused.
- `cdn/` holds committed first releases for `example` and `sermons`, a manifest pointing at both, a `vercel.json` whose rewrites match the manifest and whose headers set immutable/SWR caching + CORS, and a working `loader.js`.
- A locally-served `cdn/` mounts a widget both via a direct versioned `<script>` and via `loader.js`.
- No production embed changed; the actual Vercel deploy + `widgets.perimeter.org` DNS is documented as the remaining manual step (and Phase 4 cutover is separate).
```
