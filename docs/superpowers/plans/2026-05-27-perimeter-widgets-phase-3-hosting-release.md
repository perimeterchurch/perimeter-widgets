# Perimeter Widgets — Phase 3: Hosting & Release Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve compiled widget IIFEs from versioned URLs at `widgets.perimeter.org` with one-click promote/rollback, backed by Vercel Blob + KV and an MP-OAuth-gated Studio admin UI.

**Architecture:** A new read-only Next.js app (`apps/cdn`) streams immutable bundles from Blob and 302-redirects `latest.js` to the live version read from KV. A shared `@perimeter/release-store` package owns the KV schema + Blob paths behind injectable `KvClient`/`BlobClient` interfaces (in-memory driver for tests/local, Vercel driver in prod). A `publish-widget` script and the Studio `/admin/releases` server actions are the only writers; everything flows through the package — no inter-app API.

**Tech Stack:** pnpm 10 workspaces, Turborepo, TypeScript (strict + `exactOptionalPropertyTypes` + `verbatimModuleSyntax`), Vitest, Next.js 16 (App Router, route handlers, server actions), Better Auth (`genericOAuth` MP provider), `@upstash/redis` (Vercel's Redis Marketplace stores are Upstash under the hood; `@vercel/kv` is deprecated), `@vercel/blob`, `tsx`.

**Spec:** `docs/superpowers/specs/2026-05-27-perimeter-widgets-phase-3-hosting-release-design.md`

---

## Conventions (read before any task)

Every new workspace package follows the existing pattern (mirror `packages/api-hooks`):

- `package.json`: `"private": true`, `"type": "module"`, `exports` map points **directly at `.ts` source** (no lib build — `"build": "echo \"(no-op)\""`). Scripts: `lint` = `eslint src tests`, `typecheck` = `tsc --noEmit`, `test` = `vitest run`.
- `tsconfig.json`: `{ "extends": "../../tsconfig.base.json", "compilerOptions": { "rootDir": ".", "noEmit": true }, "include": ["src/**/*", "tests/**/*"] }`.
- ESLint is the **root flat config** (`eslint.config.js`) — no per-package eslint file.
- `verbatimModuleSyntax` is on: type-only imports MUST use `import type { X }`.
- `exactOptionalPropertyTypes` is on: optional fields that may be absent are typed `field?: T` and must not be set to `undefined` explicitly — omit them.
- `noUncheckedIndexedAccess` is on: index access yields `T | undefined`; guard it.
- Commit style: conventional commits (`feat:`, `test:`, `chore:`, `docs:`). The repo is at `perimeter-widgets/` (run git from there); branch is `docs/widgets-rebuild-design`. **Never push** — all work stays local on this branch.
- Run a single package's tests with: `pnpm --filter <pkgname> test`. Repo gate: `pnpm quality`.

Widget bundles are emitted by the Phase-1 Vite plugin to `dist/<name>/<name>.iife.js` and `dist/<name>/<name>.iife.js.map` (confirmed: `dist/sermons/sermons.iife.js`).

---

## File Structure

```
packages/release-store/                          NEW package @perimeter/release-store
  package.json · tsconfig.json · vitest.config.ts
  src/index.ts                 public surface (re-exports store + getStore + types)
  src/types.ts                 BuildRecord, ActivityEntry, ReleaseStore (interface)
  src/clients.ts               KvClient, BlobClient interfaces
  src/store.ts                 createStore(kv, blob) → ReleaseStore (all logic)
  src/keys.ts                  KV key builders (latest:/builds:/activity)
  src/drivers/memory.ts        in-memory KvClient + BlobClient (tests + local)
  src/drivers/vercel.ts        @upstash/redis + @vercel/blob impls
  src/drivers/env.ts           resolveKvConfig(env) detection + getStore() selector
  scripts/publish-widget.ts    CLI: build → upload → record (thin wrapper)
  src/publish.ts               publishWidget(opts, store) orchestration (testable)
  tests/*.test.ts

apps/cdn/                                         NEW Next.js app @ widgets.perimeter.org
  package.json · next.config.ts · tsconfig.json · vitest.config.ts
  src/app/layout.tsx · src/app/page.tsx   minimal shell (route-handler-only app)
  src/app/api/bundle/[name]/[version]/route.ts       immutable bundle
  src/app/api/bundle-map/[name]/[version]/route.ts   immutable sourcemap
  src/app/api/latest/[name]/route.ts                 302 → versioned
  src/app/api/manifest/route.ts                      names → /latest.js
  src/lib/store.ts                        lazy memoized getStore() accessor
  src/lib/cache.ts                        cache-control header constants
  tests/*.test.ts

  # next.config.ts rewrites map the PUBLIC dotted URLs → the /api routes above.
  # This mirrors the proven Studio pattern (next.config rewrites /widget-bundles/:name.js
  # → /api/widget-bundles/:name) and avoids relying on dotted route-segment folders.
  #   /:name/:version/index.js.map → /api/bundle-map/:name/:version
  #   /:name/:version/index.js     → /api/bundle/:name/:version
  #   /:name/latest.js             → /api/latest/:name
  #   /manifest.json               → /api/manifest

apps/studio/                                      CHANGED
  src/middleware.ts                       gate /admin/* (presence check, prefix `studio`)
  src/lib/auth/better-auth.ts             MP genericOAuth, stateless, prefix `studio`
  src/lib/auth/auth-client.ts             createAuthClient + genericOAuthClient
  src/app/api/auth/[...all]/route.ts      toNextJsHandler(auth)
  src/app/admin/login/page.tsx            MP sign-in entry
  src/app/admin/releases/page.tsx         per-widget build list + activity (server comp)
  src/app/admin/releases/actions.ts       promote / rollback server actions
  src/app/admin/releases/release-panel.tsx  client: promote/rollback buttons + confirm
  src/app/admin/page.tsx                  MODIFY placeholder → link to /admin/releases
  tests/*.test.ts

package.json (root)                               MODIFY: add "publish-widget" script + tsx devDep
```

---

## Chunk 1: `@perimeter/release-store` foundation

Pure data layer. Fully unit-testable with the in-memory driver; no cloud creds.

### Task 1: Scaffold the package

**Files:**
- Create: `packages/release-store/package.json`
- Create: `packages/release-store/tsconfig.json`
- Create: `packages/release-store/vitest.config.ts`
- Create: `packages/release-store/src/index.ts` (temporary empty export)

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@perimeter/release-store",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": { "types": "./src/index.ts", "default": "./src/index.ts" }
  },
  "scripts": {
    "build": "echo \"(no-op)\"",
    "lint": "eslint src tests",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "publish-widget": "tsx scripts/publish-widget.ts"
  },
  "dependencies": {
    "@upstash/redis": "^1.35.0",
    "@vercel/blob": "^0.27.0"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^2.1.8",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": ".", "noEmit": true },
  "include": ["src/**/*", "tests/**/*", "scripts/**/*"]
}
```

- [ ] **Step 3: Write `vitest.config.ts`** (node environment — no DOM)

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Write a placeholder `src/index.ts`**

```ts
export {};
```

- [ ] **Step 5: Install + verify the package is wired**

Run: `pnpm install`
Then: `pnpm --filter @perimeter/release-store typecheck`
Expected: exits 0 (no files to check fails nothing).

- [ ] **Step 6: Commit**

```bash
git add packages/release-store pnpm-lock.yaml
git commit -m "chore(release-store): scaffold package"
```

### Task 2: Data types + client interfaces

**Files:**
- Create: `packages/release-store/src/types.ts`
- Create: `packages/release-store/src/clients.ts`
- Test: `packages/release-store/tests/types.test.ts`

- [ ] **Step 1: Write the failing test** (`tests/types.test.ts`) — a compile-level smoke test that the shapes exist and are constructible.

```ts
import { describe, it, expect } from 'vitest';
import type { BuildRecord, ActivityEntry } from '../src/types.ts';

describe('release-store types', () => {
  it('constructs a BuildRecord (optional prUrl omitted)', () => {
    const b: BuildRecord = {
      version: '1.4.2',
      sha: 'abc1234',
      sizeGz: 1234,
      builtAt: '2026-05-27T00:00:00.000Z',
      blobPath: 'sermons/1.4.2/index.js',
    };
    expect(b.version).toBe('1.4.2');
  });

  it('constructs an ActivityEntry', () => {
    const a: ActivityEntry = {
      action: 'promote',
      widget: 'sermons',
      version: '1.4.2',
      at: '2026-05-27T00:00:00.000Z',
      by: 'user@perimeter.org',
    };
    expect(a.action).toBe('promote');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @perimeter/release-store test`
Expected: FAIL — `Cannot find module '../src/types.ts'`.

- [ ] **Step 3: Write `src/types.ts`**

```ts
export type BuildRecord = {
  version: string; // "1.4.2" or dev "1.4.2-abc1234"
  sha: string; // git short sha
  prUrl?: string; // populated by CI later; omit when absent (exactOptionalPropertyTypes)
  sizeGz: number; // gzipped byte size measured at publish
  builtAt: string; // ISO 8601
  blobPath: string; // "sermons/1.4.2/index.js"
};

export type ActivityAction = 'publish' | 'promote' | 'rollback';

export type ActivityEntry = {
  action: ActivityAction;
  widget: string;
  version: string;
  at: string; // ISO 8601
  by: string; // session email, or "script" for CLI publishes
};

export interface ReleaseStore {
  listBuilds(name: string): Promise<BuildRecord[]>;
  recordBuild(name: string, record: BuildRecord): Promise<void>;
  getLatest(name: string): Promise<string | null>;
  setLatest(
    name: string,
    version: string,
    action: 'promote' | 'rollback',
    by: string,
  ): Promise<void>;
  listActivity(): Promise<ActivityEntry[]>;
  uploadBundle(blobPath: string, body: Buffer, contentType: string): Promise<void>;
  readBundle(blobPath: string): Promise<ReadableStream | null>;
}
```

- [ ] **Step 4: Write `src/clients.ts`**

```ts
export interface KvClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}

export interface BlobClient {
  put(path: string, body: Buffer, contentType: string): Promise<void>;
  get(path: string): Promise<ReadableStream | null>;
  exists(path: string): Promise<boolean>;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter @perimeter/release-store test`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/release-store/src/types.ts packages/release-store/src/clients.ts packages/release-store/tests/types.test.ts
git commit -m "feat(release-store): add data types and client interfaces"
```

### Task 3: KV key builders

**Files:**
- Create: `packages/release-store/src/keys.ts`
- Test: `packages/release-store/tests/keys.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { latestKey, buildsKey, ACTIVITY_KEY } from '../src/keys.ts';

describe('kv keys', () => {
  it('builds per-widget keys', () => {
    expect(latestKey('sermons')).toBe('latest:sermons');
    expect(buildsKey('sermons')).toBe('builds:sermons');
  });
  it('has a single activity key', () => {
    expect(ACTIVITY_KEY).toBe('activity');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `pnpm --filter @perimeter/release-store test` → FAIL (module missing).

- [ ] **Step 3: Write `src/keys.ts`**

```ts
export const latestKey = (name: string): string => `latest:${name}`;
export const buildsKey = (name: string): string => `builds:${name}`;
export const ACTIVITY_KEY = 'activity';
```

- [ ] **Step 4: Run to verify it passes** — PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/release-store/src/keys.ts packages/release-store/tests/keys.test.ts
git commit -m "feat(release-store): add kv key builders"
```

### Task 4: In-memory driver

**Files:**
- Create: `packages/release-store/src/drivers/memory.ts`
- Test: `packages/release-store/tests/memory-driver.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createMemoryKv, createMemoryBlob } from '../src/drivers/memory.ts';

describe('memory kv', () => {
  it('round-trips values and returns null for missing keys', async () => {
    const kv = createMemoryKv();
    expect(await kv.get('missing')).toBeNull();
    await kv.set('k', { a: 1 });
    expect(await kv.get<{ a: number }>('k')).toEqual({ a: 1 });
  });
});

describe('memory blob', () => {
  it('stores, reports existence, and reads back as a stream', async () => {
    const blob = createMemoryBlob();
    expect(await blob.exists('p/1/index.js')).toBe(false);
    await blob.put('p/1/index.js', Buffer.from('hello'), 'application/javascript');
    expect(await blob.exists('p/1/index.js')).toBe(true);
    const stream = await blob.get('p/1/index.js');
    expect(stream).not.toBeNull();
    const text = await new Response(stream).text();
    expect(text).toBe('hello');
  });

  it('returns null reading a missing blob', async () => {
    const blob = createMemoryBlob();
    expect(await blob.get('nope')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL (module missing).

- [ ] **Step 3: Write `src/drivers/memory.ts`**

```ts
import type { BlobClient, KvClient } from '../clients.ts';

export function createMemoryKv(): KvClient {
  const store = new Map<string, unknown>();
  return {
    get<T>(key: string): Promise<T | null> {
      return Promise.resolve((store.get(key) as T) ?? null);
    },
    set<T>(key: string, value: T): Promise<void> {
      store.set(key, value);
      return Promise.resolve();
    },
  };
}

export function createMemoryBlob(): BlobClient {
  const store = new Map<string, Buffer>();
  return {
    put(path: string, body: Buffer): Promise<void> {
      store.set(path, body);
      return Promise.resolve();
    },
    get(path: string): Promise<ReadableStream | null> {
      const buf = store.get(path);
      if (!buf) return Promise.resolve(null);
      return Promise.resolve(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(buf));
            controller.close();
          },
        }),
      );
    },
    exists(path: string): Promise<boolean> {
      return Promise.resolve(store.has(path));
    },
  };
}
```

- [ ] **Step 4: Run to verify it passes** — PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/release-store/src/drivers/memory.ts packages/release-store/tests/memory-driver.test.ts
git commit -m "feat(release-store): add in-memory kv + blob driver"
```

### Task 5: Store core (`createStore`)

**Files:**
- Create: `packages/release-store/src/store.ts`
- Test: `packages/release-store/tests/store.test.ts`

- [ ] **Step 1: Write the failing test** — exercises the full ledger lifecycle, the idempotency guard, the promote/rollback activity, and the 200-entry cap.

```ts
import { describe, it, expect } from 'vitest';
import { createStore } from '../src/store.ts';
import { createMemoryKv, createMemoryBlob } from '../src/drivers/memory.ts';
import type { BuildRecord } from '../src/types.ts';

const rec = (version: string): BuildRecord => ({
  version,
  sha: version.slice(-7),
  sizeGz: 100,
  builtAt: '2026-05-27T00:00:00.000Z',
  blobPath: `sermons/${version}/index.js`,
});

function freshStore() {
  return createStore(createMemoryKv(), createMemoryBlob());
}

describe('createStore', () => {
  it('records builds newest-first and lists them', async () => {
    const s = freshStore();
    await s.recordBuild('sermons', rec('1.0.0'));
    await s.recordBuild('sermons', rec('1.1.0'));
    const builds = await s.listBuilds('sermons');
    expect(builds.map((b) => b.version)).toEqual(['1.1.0', '1.0.0']);
  });

  it('refuses a duplicate version (immutable paths)', async () => {
    const s = freshStore();
    await s.recordBuild('sermons', rec('1.0.0'));
    await expect(s.recordBuild('sermons', rec('1.0.0'))).rejects.toThrow(/already/i);
  });

  it('records publish activity', async () => {
    const s = freshStore();
    await s.recordBuild('sermons', rec('1.0.0'));
    const activity = await s.listActivity();
    expect(activity[0]).toMatchObject({ action: 'publish', widget: 'sermons', version: '1.0.0', by: 'script' });
  });

  it('setLatest writes the pointer and an activity entry', async () => {
    const s = freshStore();
    await s.recordBuild('sermons', rec('1.0.0'));
    await s.setLatest('sermons', '1.0.0', 'promote', 'me@perimeter.org');
    expect(await s.getLatest('sermons')).toBe('1.0.0');
    const activity = await s.listActivity();
    expect(activity[0]).toMatchObject({ action: 'promote', version: '1.0.0', by: 'me@perimeter.org' });
  });

  it('setLatest rejects a version that was never built', async () => {
    const s = freshStore();
    await expect(s.setLatest('sermons', '9.9.9', 'promote', 'me')).rejects.toThrow(/not.*built|unknown/i);
  });

  it('getLatest returns null when never promoted', async () => {
    const s = freshStore();
    expect(await s.getLatest('sermons')).toBeNull();
  });

  it('caps the activity log at 200 entries, newest first', async () => {
    const s = freshStore();
    for (let i = 0; i < 205; i++) await s.recordBuild('w', rec(`1.0.${i}`));
    const activity = await s.listActivity();
    expect(activity).toHaveLength(200);
    expect(activity[0]?.version).toBe('1.0.204');
  });

  it('uploadBundle + readBundle round-trips through blob', async () => {
    const s = freshStore();
    await s.uploadBundle('sermons/1.0.0/index.js', Buffer.from('js'), 'application/javascript');
    const stream = await s.readBundle('sermons/1.0.0/index.js');
    expect(await new Response(stream).text()).toBe('js');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL (module missing).

- [ ] **Step 3: Write `src/store.ts`**

```ts
import type { BlobClient, KvClient } from './clients.ts';
import type { ActivityEntry, BuildRecord, ReleaseStore } from './types.ts';
import { ACTIVITY_KEY, buildsKey, latestKey } from './keys.ts';

const ACTIVITY_CAP = 200;

export function createStore(kv: KvClient, blob: BlobClient): ReleaseStore {
  async function pushActivity(entry: ActivityEntry): Promise<void> {
    const log = (await kv.get<ActivityEntry[]>(ACTIVITY_KEY)) ?? [];
    await kv.set(ACTIVITY_KEY, [entry, ...log].slice(0, ACTIVITY_CAP));
  }

  return {
    async listBuilds(name) {
      return (await kv.get<BuildRecord[]>(buildsKey(name))) ?? [];
    },

    async recordBuild(name, record) {
      const builds = (await kv.get<BuildRecord[]>(buildsKey(name))) ?? [];
      if (builds.some((b) => b.version === record.version)) {
        throw new Error(`Build ${name}@${record.version} already exists; versions are immutable`);
      }
      await kv.set(buildsKey(name), [record, ...builds]);
      await pushActivity({
        action: 'publish',
        widget: name,
        version: record.version,
        at: record.builtAt,
        by: 'script',
      });
    },

    async getLatest(name) {
      return await kv.get<string>(latestKey(name));
    },

    async setLatest(name, version, action, by) {
      const builds = (await kv.get<BuildRecord[]>(buildsKey(name))) ?? [];
      if (!builds.some((b) => b.version === version)) {
        throw new Error(`Cannot ${action} ${name}@${version}: not a built version`);
      }
      await kv.set(latestKey(name), version);
      await pushActivity({
        action,
        widget: name,
        version,
        at: new Date().toISOString(),
        by,
      });
    },

    async listActivity() {
      return (await kv.get<ActivityEntry[]>(ACTIVITY_KEY)) ?? [];
    },

    uploadBundle(blobPath, body, contentType) {
      return blob.put(blobPath, body, contentType);
    },

    readBundle(blobPath) {
      return blob.get(blobPath);
    },
  };
}
```

- [ ] **Step 4: Run to verify it passes** — PASS (all store tests).

- [ ] **Step 5: Update `src/index.ts` to export the public surface**

```ts
export { createStore } from './store.ts';
export { createMemoryKv, createMemoryBlob } from './drivers/memory.ts';
export type { BuildRecord, ActivityEntry, ActivityAction, ReleaseStore } from './types.ts';
export type { KvClient, BlobClient } from './clients.ts';
```

- [ ] **Step 6: Verify typecheck + lint** — `pnpm --filter @perimeter/release-store typecheck && pnpm --filter @perimeter/release-store lint` → exit 0.

- [ ] **Step 7: Commit**

```bash
git add packages/release-store/src/store.ts packages/release-store/src/index.ts packages/release-store/tests/store.test.ts
git commit -m "feat(release-store): add store core with ledger, pointer, idempotency, activity cap"
```

---

## Chunk 2: Vercel driver + env detection + selector

The real-cloud impl plus the `getStore()` factory. Env detection is a pure, tested unit; the thin Vercel client wrappers are not unit-tested (no creds) but are exercised in prod.

### Task 6: KV env detection

**Files:**
- Create: `packages/release-store/src/drivers/env.ts`
- Test: `packages/release-store/tests/env.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { resolveKvConfig } from '../src/drivers/env.ts';

describe('resolveKvConfig', () => {
  it('detects Vercel KV REST vars', () => {
    expect(
      resolveKvConfig({ KV_REST_API_URL: 'https://x', KV_REST_API_TOKEN: 't' }),
    ).toEqual({ kind: 'vercel-kv', url: 'https://x', token: 't' });
  });

  it('throws a clear, actionable error when no recognized vars are present', () => {
    expect(() => resolveKvConfig({})).toThrow(/KV_REST_API_URL|REDIS_URL/);
  });

  it('throws when a REDIS_URL-only store is present (adapter not wired yet)', () => {
    // The Vercel/Upstash marketplace store usually also exposes KV_REST_API_*;
    // if only REDIS_URL exists we fail loudly rather than guess.
    expect(() => resolveKvConfig({ REDIS_URL: 'redis://x' })).toThrow(/REDIS_URL/);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Write `src/drivers/env.ts`** (detection only for now; selector added in Task 7)

```ts
export type KvConfig = { kind: 'vercel-kv'; url: string; token: string };

export function resolveKvConfig(env: Record<string, string | undefined>): KvConfig {
  const url = env['KV_REST_API_URL'];
  const token = env['KV_REST_API_TOKEN'];
  if (url && token) return { kind: 'vercel-kv', url, token };

  if (env['REDIS_URL']) {
    throw new Error(
      'release-store: found REDIS_URL but no KV_REST_API_URL/KV_REST_API_TOKEN. ' +
        'The Vercel KV REST credentials are required; if this store only exposes a ' +
        'raw REDIS_URL, add an Upstash adapter (follow-up).',
    );
  }

  throw new Error(
    'release-store: no KV credentials found. Set KV_REST_API_URL + KV_REST_API_TOKEN ' +
      '(or RELEASE_STORE_DRIVER=memory for local/dev).',
  );
}
```

- [ ] **Step 4: Run to verify it passes** — PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/release-store/src/drivers/env.ts packages/release-store/tests/env.test.ts
git commit -m "feat(release-store): add KV env detection"
```

### Task 7: Vercel driver + `getStore()` selector

**Files:**
- Create: `packages/release-store/src/drivers/vercel.ts`
- Modify: `packages/release-store/src/drivers/env.ts` (add `getStore`)
- Modify: `packages/release-store/src/index.ts` (export `getStore`)
- Test: `packages/release-store/tests/get-store.test.ts`

- [ ] **Step 1: Write the failing test** (only the memory branch is unit-tested; the vercel branch requires creds)

```ts
import { describe, it, expect } from 'vitest';
import { getStore } from '../src/drivers/env.ts';

describe('getStore', () => {
  it('returns a working store when RELEASE_STORE_DRIVER=memory', async () => {
    const s = getStore({ RELEASE_STORE_DRIVER: 'memory' });
    await s.uploadBundle('w/1/index.js', Buffer.from('x'), 'application/javascript');
    expect(await s.getLatest('w')).toBeNull();
  });

  it('memory store is isolated per call', async () => {
    const a = getStore({ RELEASE_STORE_DRIVER: 'memory' });
    const b = getStore({ RELEASE_STORE_DRIVER: 'memory' });
    await a.recordBuild('w', {
      version: '1.0.0', sha: 'x', sizeGz: 1, builtAt: 't', blobPath: 'w/1.0.0/index.js',
    });
    expect(await b.listBuilds('w')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL (`getStore` not exported).

- [ ] **Step 3: Write `src/drivers/vercel.ts`** — uses `@upstash/redis`, which is what Vercel's Redis Marketplace stores actually run under the hood (the older `@vercel/kv` is deprecated; it was just a thin wrapper around `@upstash/redis`). The Marketplace integration exposes the same `KV_REST_API_URL` + `KV_REST_API_TOKEN` env vars.

```ts
import { Redis } from '@upstash/redis';
import { put, head } from '@vercel/blob';
import type { BlobClient, KvClient } from '../clients.ts';
import type { KvConfig } from './env.ts';

export function createVercelKv(config: KvConfig): KvClient {
  const client = new Redis({ url: config.url, token: config.token });
  return {
    async get<T>(key: string): Promise<T | null> {
      return (await client.get<T>(key)) ?? null;
    },
    async set<T>(key: string, value: T): Promise<void> {
      await client.set(key, value as unknown as string);
    },
  };
}

export function createVercelBlob(token: string): BlobClient {
  const base = process.env['BLOB_PUBLIC_BASE_URL'] ?? '';
  return {
    async put(path, body, contentType) {
      await put(path, body, {
        access: 'public',
        token,
        contentType,
        addRandomSuffix: false,
        cacheControlMaxAge: 31536000,
      });
    },
    async get(path) {
      // Bundles are public; the cdn route fetches the public Blob URL.
      const res = await fetch(`${base}/${path}`);
      if (!res.ok || !res.body) return null;
      return res.body;
    },
    async exists(path) {
      try {
        await head(`${base}/${path}`, { token });
        return true;
      } catch {
        return false;
      }
    },
  };
}
```

> Note for the implementer: `@vercel/blob` stores objects under a store-scoped public base URL. `BLOB_PUBLIC_BASE_URL` is the store's base (set at provisioning). If `@vercel/blob`'s `put` return value (`{ url }`) is preferred over a derived path, the driver may record the returned URL — but the immutable `blobPath` scheme (`<name>/<version>/index.js`) is the contract the cdn relies on, so keep `addRandomSuffix: false` so paths are deterministic.

- [ ] **Step 4: Add `getStore` to `src/drivers/env.ts`**

```ts
import { createStore } from '../store.ts';
import type { ReleaseStore } from '../types.ts';
import { createMemoryKv, createMemoryBlob } from './memory.ts';
import { createVercelKv, createVercelBlob } from './vercel.ts';

export function getStore(env: Record<string, string | undefined> = process.env): ReleaseStore {
  if (env['RELEASE_STORE_DRIVER'] === 'memory') {
    return createStore(createMemoryKv(), createMemoryBlob());
  }
  const kvConfig = resolveKvConfig(env);
  const blobToken = env['BLOB_READ_WRITE_TOKEN'];
  if (!blobToken) {
    throw new Error('release-store: BLOB_READ_WRITE_TOKEN is required for the Vercel driver.');
  }
  return createStore(createVercelKv(kvConfig), createVercelBlob(blobToken));
}
```

(Add the imports at the top of `env.ts` alongside the existing code.)

- [ ] **Step 5: Export `getStore` from `src/index.ts`** — add `export { getStore, resolveKvConfig } from './drivers/env.ts';`

- [ ] **Step 6: Run to verify it passes** — `pnpm --filter @perimeter/release-store test` → PASS. Then `pnpm install` (picks up `@vercel/kv`, `@vercel/blob`) and `pnpm --filter @perimeter/release-store typecheck` → exit 0.

- [ ] **Step 7: Commit**

```bash
git add packages/release-store pnpm-lock.yaml
git commit -m "feat(release-store): add Vercel driver and getStore selector"
```

---

## Chunk 3: `apps/cdn` serving app

Read-only Next.js app. Every route is tested by importing its `GET` handler and calling it with a memory store seeded via module mock.

### Task 8: Scaffold `apps/cdn`

**Files:**
- Create: `apps/cdn/package.json`, `apps/cdn/next.config.ts`, `apps/cdn/tsconfig.json`, `apps/cdn/vitest.config.ts`
- Create: `apps/cdn/src/app/layout.tsx`, `apps/cdn/src/app/page.tsx`
- Create: `apps/cdn/src/lib/store.ts` (single shared `getStore()` accessor)
- Create: `apps/cdn/src/lib/cache.ts`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@perimeter/cdn",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "eslint src tests",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@perimeter/release-store": "workspace:*",
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "@types/react": "^19.0.7",
    "@types/react-dom": "^19.0.3",
    "@vitest/coverage-v8": "^2.1.8",
    "typescript": "^5.7.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Write `next.config.ts`** — rewrites map public dotted URLs to clean `/api` routes (proven Studio pattern). Order the `.js.map` rewrite before `.js` for clarity (they don't actually collide, since segment literals differ).

```ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  async rewrites() {
    return [
      { source: '/:name/:version/index.js.map', destination: '/api/bundle-map/:name/:version' },
      { source: '/:name/:version/index.js', destination: '/api/bundle/:name/:version' },
      { source: '/:name/latest.js', destination: '/api/latest/:name' },
      { source: '/manifest.json', destination: '/api/manifest' },
    ];
  },
};

export default config;
```

- [ ] **Step 3: Write `tsconfig.json`** (mirror studio)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "noEmit": true,
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*", "tests/**/*", "next-env.d.ts"]
}
```

- [ ] **Step 4: Write `vitest.config.ts`** (node env; `@` alias)

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
```

- [ ] **Step 5: Write minimal `src/app/layout.tsx` + `src/app/page.tsx`**

```tsx
// layout.tsx
import type { ReactNode } from 'react';
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// page.tsx
export default function Home() {
  return <main>Perimeter Widgets CDN</main>;
}
```

- [ ] **Step 6: Write `src/lib/cache.ts`**

```ts
export const IMMUTABLE = 'public, max-age=31536000, immutable';
export const POINTER = 'public, s-maxage=300, stale-while-revalidate=86400';
export const JS_CONTENT_TYPE = 'application/javascript; charset=utf-8';
```

- [ ] **Step 7: Write `src/lib/store.ts`** — **lazy + memoized.** Do NOT call `getStore()` at module top level: route-handler modules are imported during `next build`, and `getStore()` throws without KV/Blob env. A lazy accessor defers that to request time.

```ts
import { getStore } from '@perimeter/release-store';
import type { ReleaseStore } from '@perimeter/release-store';

let cached: ReleaseStore | undefined;

export function releaseStore(): ReleaseStore {
  return (cached ??= getStore());
}
```

- [ ] **Step 8: Verify build wiring** — `pnpm install && pnpm --filter @perimeter/cdn typecheck` → exit 0. (Full `next build` is verified in Task 10 once routes exist.)

- [ ] **Step 9: Commit**

```bash
git add apps/cdn pnpm-lock.yaml
git commit -m "chore(cdn): scaffold widgets.perimeter.org Next app"
```

### Task 9: Immutable bundle + sourcemap routes

**Files:**
- Create: `apps/cdn/src/app/api/bundle/[name]/[version]/route.ts`
- Create: `apps/cdn/src/app/api/bundle-map/[name]/[version]/route.ts`
- Test: `apps/cdn/tests/versioned.test.ts`

> These are clean `/api` route handlers; the public dotted URLs reach them via the `next.config.ts` rewrites from Task 8. No dotted route-segment folders.

- [ ] **Step 1: Write the failing test** — mock `@/lib/store` with a memory store seeded with a bundle. Note the mock returns `releaseStore` (the lazy accessor), not `store`.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore, createMemoryKv, createMemoryBlob } from '@perimeter/release-store';

const memory = createStore(createMemoryKv(), createMemoryBlob());
vi.mock('@/lib/store', () => ({ releaseStore: () => memory }));

beforeEach(async () => {
  await memory.uploadBundle('sermons/1.0.0/index.js', Buffer.from('BUNDLE'), 'application/javascript');
});

describe('GET /api/bundle/[name]/[version]', () => {
  it('streams the immutable bundle with the 1-year cache header', async () => {
    const { GET } = await import('@/app/api/bundle/[name]/[version]/route');
    const res = await GET(new Request('https://widgets.perimeter.org/sermons/1.0.0/index.js'), {
      params: Promise.resolve({ name: 'sermons', version: '1.0.0' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(res.headers.get('content-type')).toBe('application/javascript; charset=utf-8');
    expect(await res.text()).toBe('BUNDLE');
  });

  it('404s an unknown version', async () => {
    const { GET } = await import('@/app/api/bundle/[name]/[version]/route');
    const res = await GET(new Request('https://x/sermons/9.9.9/index.js'), {
      params: Promise.resolve({ name: 'sermons', version: '9.9.9' }),
    });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL (route missing).

- [ ] **Step 3: Write `api/bundle/[name]/[version]/route.ts`**

```ts
import { releaseStore } from '@/lib/store';
import { IMMUTABLE, JS_CONTENT_TYPE } from '@/lib/cache';

type Ctx = { params: Promise<{ name: string; version: string }> };

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  const { name, version } = await ctx.params;
  const stream = await releaseStore().readBundle(`${name}/${version}/index.js`);
  if (!stream) return new Response('not found', { status: 404 });
  return new Response(stream, {
    headers: { 'content-type': JS_CONTENT_TYPE, 'cache-control': IMMUTABLE },
  });
}
```

- [ ] **Step 4: Write `api/bundle-map/[name]/[version]/route.ts`** (same shape; reads the `.map`, content-type `application/json`)

```ts
import { releaseStore } from '@/lib/store';
import { IMMUTABLE } from '@/lib/cache';

type Ctx = { params: Promise<{ name: string; version: string }> };

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  const { name, version } = await ctx.params;
  const stream = await releaseStore().readBundle(`${name}/${version}/index.js.map`);
  if (!stream) return new Response('not found', { status: 404 });
  return new Response(stream, {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': IMMUTABLE },
  });
}
```

- [ ] **Step 5: Run to verify it passes** — PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/cdn/src/app/api apps/cdn/tests/versioned.test.ts
git commit -m "feat(cdn): serve immutable versioned bundle + sourcemap"
```

### Task 10: `latest.js` 302 + `manifest.json`

**Files:**
- Create: `apps/cdn/src/app/api/latest/[name]/route.ts`
- Create: `apps/cdn/src/app/api/manifest/route.ts`
- Test: `apps/cdn/tests/latest.test.ts`, `apps/cdn/tests/manifest.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/latest.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore, createMemoryKv, createMemoryBlob } from '@perimeter/release-store';

const memory = createStore(createMemoryKv(), createMemoryBlob());
vi.mock('@/lib/store', () => ({ releaseStore: () => memory }));

const build = (v: string) => ({ version: v, sha: 'x', sizeGz: 1, builtAt: 't', blobPath: `sermons/${v}/index.js` });

describe('GET /api/latest/[name]', () => {
  beforeEach(async () => {
    await memory.recordBuild('sermons', build('1.0.0'));
  });

  it('302-redirects to the live versioned URL with the pointer cache header', async () => {
    await memory.setLatest('sermons', '1.0.0', 'promote', 'me');
    const { GET } = await import('@/app/api/latest/[name]/route');
    const res = await GET(new Request('https://widgets.perimeter.org/sermons/latest.js'), {
      params: Promise.resolve({ name: 'sermons' }),
    });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/sermons/1.0.0/index.js');
    expect(res.headers.get('cache-control')).toBe('public, s-maxage=300, stale-while-revalidate=86400');
  });

  it('404s when the widget was never promoted', async () => {
    const { GET } = await import('@/app/api/latest/[name]/route');
    const res = await GET(new Request('https://x/sermons/latest.js'), {
      params: Promise.resolve({ name: 'sermons' }),
    });
    expect(res.status).toBe(404);
  });
});
```

```ts
// tests/manifest.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createStore, createMemoryKv, createMemoryBlob } from '@perimeter/release-store';

const memory = createStore(createMemoryKv(), createMemoryBlob());
vi.mock('@/lib/store', () => ({ releaseStore: () => memory }));

describe('GET /api/manifest', () => {
  it('lists only promoted widgets as name → latest.js URLs', async () => {
    await memory.recordBuild('sermons', { version: '1.0.0', sha: 'x', sizeGz: 1, builtAt: 't', blobPath: 'sermons/1.0.0/index.js' });
    await memory.setLatest('sermons', '1.0.0', 'promote', 'me');
    const { GET } = await import('@/app/api/manifest/route');
    const res = await GET();
    expect(res.headers.get('cache-control')).toBe('public, s-maxage=300, stale-while-revalidate=86400');
    expect(await res.json()).toEqual({ sermons: '/sermons/latest.js' });
  });
});
```

> The manifest needs to know which widgets exist. Since the store is keyed per-widget, expose a `listWidgets()` on the store that scans for promoted pointers. Add it in Step 3 (store change is small and belongs with this task because only the manifest needs it).

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Add `listWidgets()` to the store** — extend `ReleaseStore` + `createStore`. The memory and Vercel KV clients need a way to enumerate promoted widgets. Simplest robust approach: maintain a `widgets` set key updated on `setLatest`.

In `src/keys.ts` add: `export const WIDGETS_KEY = 'widgets';`

In `types.ts` `ReleaseStore` add: `listWidgets(): Promise<string[]>;`

In `store.ts`:
- In `setLatest`, after writing the pointer, add the name to the `widgets` set:
  ```ts
  const widgets = (await kv.get<string[]>(WIDGETS_KEY)) ?? [];
  if (!widgets.includes(name)) await kv.set(WIDGETS_KEY, [...widgets, name].sort());
  ```
- Add the method:
  ```ts
  async listWidgets() {
    return (await kv.get<string[]>(WIDGETS_KEY)) ?? [];
  },
  ```
Add a store test in `tests/store.test.ts` asserting `listWidgets` returns promoted widgets only, and re-run `pnpm --filter @perimeter/release-store test`.

- [ ] **Step 4: Write `api/latest/[name]/route.ts`**

```ts
import { releaseStore } from '@/lib/store';
import { POINTER } from '@/lib/cache';

type Ctx = { params: Promise<{ name: string }> };

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  const { name } = await ctx.params;
  const version = await releaseStore().getLatest(name);
  if (!version) return new Response('not found', { status: 404 });
  return new Response(null, {
    status: 302,
    headers: { location: `/${name}/${version}/index.js`, 'cache-control': POINTER },
  });
}
```

- [ ] **Step 5: Write `api/manifest/route.ts`**

```ts
import { releaseStore } from '@/lib/store';
import { POINTER } from '@/lib/cache';

export async function GET(): Promise<Response> {
  const widgets = await releaseStore().listWidgets();
  const manifest = Object.fromEntries(widgets.map((name) => [name, `/${name}/latest.js`]));
  return new Response(JSON.stringify(manifest), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': POINTER },
  });
}
```

- [ ] **Step 6: Run to verify it passes** — `pnpm --filter @perimeter/release-store test && pnpm --filter @perimeter/cdn test` → PASS.

- [ ] **Step 7: Verify the real build + rewrites resolve** — the unit tests call handlers directly and don't exercise Next routing, so confirm the framework wiring once:
  - `RELEASE_STORE_DRIVER=memory pnpm --filter @perimeter/cdn build` → completes with no error (proves the lazy `releaseStore()` doesn't throw at build/collection time, and the routes compile).
  - Optionally, smoke the rewrites: `RELEASE_STORE_DRIVER=memory pnpm --filter @perimeter/cdn dev` in one shell, then in another `curl -sI http://localhost:3001/sermons/1.0.0/index.js` should 404 (empty memory store) — a 404 from the route handler (not a Next 404 page) confirms the rewrite resolved to `/api/bundle/...`. Stop the dev server after.
  - If a rewrite source pattern is rejected by Next 16, fall back to a single catch-all `src/app/api/[...segments]/route.ts` that parses the path — but the Studio-proven `:param` + literal-suffix form should work.

- [ ] **Step 8: Commit**

```bash
git add apps/cdn packages/release-store
git commit -m "feat(cdn): add latest.js 302 redirect and manifest.json"
```

---

## Chunk 4: `publish-widget` script

The build → upload → record pipeline. The orchestration is a pure function tested with a memory store + injected hooks; the CLI wires real git/build/fs.

### Task 11: `publishWidget` orchestration

**Files:**
- Create: `packages/release-store/src/publish.ts`
- Modify: `packages/release-store/src/index.ts` (export `publishWidget`, `computeVersion`)
- Test: `packages/release-store/tests/publish.test.ts`

- [ ] **Step 1: Write the failing test** — inject the build/read/version hooks so no real shell runs.

```ts
import { describe, it, expect } from 'vitest';
import { createStore, createMemoryKv, createMemoryBlob } from '../src/index.ts';
import { publishWidget, computeVersion } from '../src/publish.ts';

describe('computeVersion', () => {
  it('uses bare version on main', () => {
    expect(computeVersion('1.4.2', 'abc1234', 'main')).toBe('1.4.2');
  });
  it('appends short sha off main', () => {
    expect(computeVersion('1.4.2', 'abc1234', 'feature/x')).toBe('1.4.2-abc1234');
  });
});

describe('publishWidget', () => {
  it('builds, uploads bundle+map, and records the available build', async () => {
    const store = createStore(createMemoryKv(), createMemoryBlob());
    const result = await publishWidget(
      { name: 'sermons', force: false },
      {
        store,
        readPackageVersion: () => '1.4.2',
        gitSha: () => 'abc1234',
        gitBranch: () => 'main',
        build: async () => {},
        readArtifact: (p) => Buffer.from(p.endsWith('.map') ? 'MAP' : 'JS'),
      },
    );
    expect(result.version).toBe('1.4.2');
    expect(result.blobPath).toBe('sermons/1.4.2/index.js');

    const builds = await store.listBuilds('sermons');
    expect(builds[0]?.version).toBe('1.4.2');
    expect(builds[0]?.sizeGz).toBeGreaterThan(0);
    expect(await store.getLatest('sermons')).toBeNull(); // available, NOT live

    const js = await store.readBundle('sermons/1.4.2/index.js');
    expect(await new Response(js).text()).toBe('JS');
    const map = await store.readBundle('sermons/1.4.2/index.js.map');
    expect(await new Response(map).text()).toBe('MAP');
  });

  it('refuses to republish an existing version', async () => {
    const store = createStore(createMemoryKv(), createMemoryBlob());
    const hooks = {
      store,
      readPackageVersion: () => '1.4.2',
      gitSha: () => 'abc1234',
      gitBranch: () => 'main',
      build: async () => {},
      readArtifact: () => Buffer.from('JS'),
    };
    await publishWidget({ name: 'sermons', force: false }, hooks);
    await expect(publishWidget({ name: 'sermons', force: false }, hooks)).rejects.toThrow(/already/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Write `src/publish.ts`**

```ts
import { gzipSync } from 'node:zlib';
import type { BuildRecord, ReleaseStore } from './types.ts';

export function computeVersion(pkgVersion: string, sha: string, branch: string): string {
  return branch === 'main' ? pkgVersion : `${pkgVersion}-${sha}`;
}

export interface PublishHooks {
  store: ReleaseStore;
  readPackageVersion: (name: string) => string;
  gitSha: () => string;
  gitBranch: () => string;
  build: (name: string) => Promise<void>;
  readArtifact: (path: string) => Buffer;
}

export interface PublishOptions {
  name: string;
  force: boolean;
}

export async function publishWidget(opts: PublishOptions, hooks: PublishHooks): Promise<BuildRecord> {
  const { name } = opts;
  const version = computeVersion(hooks.readPackageVersion(name), hooks.gitSha(), hooks.gitBranch());

  const existing = await hooks.store.listBuilds(name);
  if (existing.some((b) => b.version === version) && !opts.force) {
    throw new Error(`Build ${name}@${version} already exists; versions are immutable (use --force on a -sha dev build)`);
  }

  await hooks.build(name);

  const jsPath = `dist/${name}/${name}.iife.js`;
  const mapPath = `${jsPath}.map`;
  const js = hooks.readArtifact(jsPath);
  const map = hooks.readArtifact(mapPath);

  const blobPath = `${name}/${version}/index.js`;
  await hooks.store.uploadBundle(blobPath, js, 'application/javascript');
  await hooks.store.uploadBundle(`${name}/${version}/index.js.map`, map, 'application/json');

  const record: BuildRecord = {
    version,
    sha: hooks.gitSha(),
    sizeGz: gzipSync(js).length,
    builtAt: new Date().toISOString(),
    blobPath,
  };
  await hooks.store.recordBuild(name, record);
  return record;
}
```

- [ ] **Step 4: Run to verify it passes** — PASS.

- [ ] **Step 5: Export from `src/index.ts`** — `export { publishWidget, computeVersion } from './publish.ts';` plus `export type { PublishHooks, PublishOptions } from './publish.ts';`

- [ ] **Step 6: Commit**

```bash
git add packages/release-store/src/publish.ts packages/release-store/src/index.ts packages/release-store/tests/publish.test.ts
git commit -m "feat(release-store): add publishWidget orchestration"
```

### Task 12: The CLI wrapper + root script

**Files:**
- Create: `packages/release-store/scripts/publish-widget.ts`
- Modify: root `package.json` (add `publish-widget` script + `tsx` devDep)

- [ ] **Step 1: Write `scripts/publish-widget.ts`** (no unit test — it is the thin shell/IO wiring around the tested `publishWidget`)

```ts
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getStore, publishWidget } from '../src/index.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function sh(cmd: string): string {
  return execSync(cmd, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

async function main(): Promise<void> {
  const name = process.argv[2];
  const force = process.argv.includes('--force');
  if (!name) {
    console.error('usage: pnpm publish-widget <name> [--force]');
    process.exit(1);
  }

  const record = await publishWidget(
    { name, force },
    {
      store: getStore(),
      readPackageVersion: (n) =>
        JSON.parse(readFileSync(path.join(repoRoot, 'widgets', n, 'package.json'), 'utf8')).version,
      gitSha: () => sh('git rev-parse --short HEAD'),
      gitBranch: () => sh('git rev-parse --abbrev-ref HEAD'),
      build: async (n) => {
        sh(`pnpm --filter @perimeter/widget-${n} build`);
      },
      readArtifact: (p) => readFileSync(path.join(repoRoot, p)),
    },
  );

  console.log(`Published ${name}@${record.version} (${(record.sizeGz / 1024).toFixed(1)} KB gz) — available, not yet live.`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
```

- [ ] **Step 2: Add the root convenience script + tsx devDep** — in root `package.json`:
  - `scripts`: add `"publish-widget": "pnpm --filter @perimeter/release-store publish-widget --"`
  - `devDependencies`: add `"tsx": "^4.19.2"` (root, so the package's `tsx scripts/...` resolves) — then `pnpm install`.

> Verify arg passthrough: `pnpm publish-widget sermons` should forward `sermons` to the script. If the `--` passthrough proves awkward with the filter, instead set the root script to `"publish-widget": "tsx packages/release-store/scripts/publish-widget.ts"` and drop the package-level script. Pick whichever passes args cleanly; confirm with a dry run that prints the parsed name.

- [ ] **Step 3: Smoke-test locally with the memory driver** (no cloud creds)

Run: `RELEASE_STORE_DRIVER=memory pnpm publish-widget sermons`
Expected: builds sermons, prints `Published sermons@<version> (… KB gz) — available, not yet live.` (The memory store is per-process, so the record won't persist — this only verifies the pipeline runs end-to-end without throwing.)

> Note: `widgets/sermons/package.json` currently has `"version": "0.0.0"`, so on `main` the published version is `0.0.0` and the immutable path is `sermons/0.0.0/index.js`. That is valid (functionally fine), just not a meaningful semver. Bumping the sermons version is a separate decision — do NOT change it as part of this task; expect `0.0.0` until the owner bumps it.

- [ ] **Step 4: Commit**

```bash
git add packages/release-store/scripts/publish-widget.ts package.json pnpm-lock.yaml
git commit -m "feat(release-store): add publish-widget CLI + root script"
```

---

## Chunk 5: Studio — Better Auth + middleware

Adds MP OAuth gating to `/admin/*`. Mirrors `metrics/src/lib/auth/*` exactly, changing only the cookie prefix (`studio`) and the redirect target (`/admin/login`).

### Task 13: Better Auth server + client + route handler

**Files:**
- Modify: `apps/studio/package.json` (add `better-auth`)
- Create: `apps/studio/src/lib/auth/better-auth.ts`
- Create: `apps/studio/src/lib/auth/auth-client.ts`
- Create: `apps/studio/src/app/api/auth/[...all]/route.ts`

- [ ] **Step 1: Add the dependency** — in `apps/studio/package.json` dependencies add `"better-auth": "^1.5.4"`, then `pnpm install`.

- [ ] **Step 2: Write `src/lib/auth/better-auth.ts`** (stateless; cookie prefix `studio`)

```ts
import { betterAuth } from 'better-auth';
import { genericOAuth } from 'better-auth/plugins';

const mpBaseURL = process.env.MP_API_BASEURL || '';
const mpOauthURL = `${mpBaseURL}/oauth`;

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  user: {
    additionalFields: {
      firstName: { type: 'string', required: false },
      lastName: { type: 'string', required: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 60 * 24, refreshCache: true },
  },
  account: { storeStateStrategy: 'cookie', storeAccountCookie: true },
  advanced: { cookiePrefix: 'studio' },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: 'ministryplatform',
          discoveryUrl: `${mpOauthURL}/.well-known/openid-configuration`,
          clientId: process.env.MP_API_CLIENT || '',
          clientSecret: process.env.MP_API_SECRET || '',
          scopes: [
            'openid',
            'profile',
            'email',
            'offline_access',
            'http://www.thinkministry.com/dataplatform/scopes/all',
          ],
          pkce: false,
          mapProfileToUser: async (profile) => ({
            name: `${profile.given_name || ''} ${profile.family_name || ''}`.trim() || profile.email,
            email: profile.email,
            firstName: profile.given_name || '',
            lastName: profile.family_name || '',
          }),
        },
      ],
    }),
  ],
});

export type BetterAuthSession = typeof auth.$Infer.Session;
```

- [ ] **Step 3: Write `src/lib/auth/auth-client.ts`**

```ts
import { createAuthClient } from 'better-auth/react';
import { genericOAuthClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({ plugins: [genericOAuthClient()] });
export const { signIn, signOut, useSession } = authClient;
```

- [ ] **Step 4: Write `src/app/api/auth/[...all]/route.ts`**

```ts
import { auth } from '@/lib/auth/better-auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 5: Verify typecheck** — `pnpm --filter @perimeter/studio typecheck` → exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/studio/src/lib/auth apps/studio/src/app/api/auth apps/studio/package.json pnpm-lock.yaml
git commit -m "feat(studio): add Better Auth + MP OAuth provider"
```

### Task 14: `/admin/*` middleware + login page

**Files:**
- Create: `apps/studio/src/middleware.ts`
- Create: `apps/studio/src/app/admin/login/page.tsx`
- Test: `apps/studio/tests/middleware.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('better-auth/cookies', () => ({
  getSessionCookie: (req: NextRequest) => (req.cookies.get('studio.session_token') ? 'tok' : null),
}));

describe('admin middleware', () => {
  it('passes through when a session cookie is present', async () => {
    const { middleware } = await import('../src/middleware.ts');
    const req = new NextRequest('https://studio.perimeter.org/admin/releases');
    req.cookies.set('studio.session_token', 'x');
    const res = middleware(req);
    expect(res).toBeUndefined();
  });

  it('redirects to /admin/login when no session cookie', async () => {
    const { middleware } = await import('../src/middleware.ts');
    const req = new NextRequest('https://studio.perimeter.org/admin/releases');
    const res = middleware(req);
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toContain('/admin/login');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL (middleware missing).

- [ ] **Step 3: Write `src/middleware.ts`** (presence check only; matcher scoped to `/admin`, excluding the login page + auth API)

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export function middleware(req: NextRequest): NextResponse | undefined {
  const sessionToken = getSessionCookie(req, { cookiePrefix: 'studio' });
  if (sessionToken) return;
  return NextResponse.redirect(new URL('/admin/login', req.url));
}

export const config = {
  matcher: ['/admin/((?!login).*)'],
};
```

- [ ] **Step 4: Write `src/app/admin/login/page.tsx`** (client component; MP sign-in)

```tsx
'use client';
import { signIn } from '@/lib/auth/auth-client';

export default function AdminLogin() {
  return (
    <main className="mx-auto max-w-sm p-8 space-y-4">
      <h1 className="text-xl font-semibold">Admin sign-in</h1>
      <button
        className="rounded-md border border-border px-4 py-2 text-sm"
        onClick={() => void signIn.social({ provider: 'ministryplatform', callbackURL: '/admin/releases' })}
      >
        Sign in with Ministry Platform
      </button>
    </main>
  );
}
```

> This matches the **verified** metrics reference (`metrics/src/app/signin/page.tsx:25`): `authClient.signIn.social({ provider: 'ministryplatform', callbackURL })`. `signIn` here is the destructured `authClient.signIn`, so `signIn.social(...)` is identical. Do NOT use `signIn.oauth2(...)` — the working sibling app uses `.social({ provider })`.

- [ ] **Step 5: Run to verify it passes** — `pnpm --filter @perimeter/studio test` → middleware tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/studio/src/middleware.ts apps/studio/src/app/admin/login apps/studio/tests/middleware.test.ts
git commit -m "feat(studio): gate /admin/* with MP-OAuth middleware + login page"
```

---

## Chunk 6: Studio — `/admin/releases` UI

Server component lists builds + activity; server actions do promote/rollback with a server-side session re-check; a client panel renders the buttons.

### Task 15: Promote / rollback server actions

**Files:**
- Create: `apps/studio/src/lib/release-store.ts` (shared `getStore()` accessor)
- Create: `apps/studio/src/app/admin/releases/actions.ts`
- Modify: `apps/studio/package.json` (add `@perimeter/release-store`)
- Test: `apps/studio/tests/release-actions.test.ts`

- [ ] **Step 1: Add the dependency** — `apps/studio/package.json` dependencies add `"@perimeter/release-store": "workspace:*"`, then `pnpm install`.

- [ ] **Step 2: Write `src/lib/release-store.ts`** — lazy + memoized (same rationale as the cdn app: server-action/page modules are imported during `next build`).

```ts
import { getStore } from '@perimeter/release-store';
import type { ReleaseStore } from '@perimeter/release-store';

let cached: ReleaseStore | undefined;

export function releaseStore(): ReleaseStore {
  return (cached ??= getStore());
}
```

- [ ] **Step 3: Write the failing test** — mock the session + store; assert the action re-checks the session and calls `setLatest`.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore, createMemoryKv, createMemoryBlob } from '@perimeter/release-store';

const memory = createStore(createMemoryKv(), createMemoryBlob());
vi.mock('@/lib/release-store', () => ({ releaseStore: () => memory }));

const getSession = vi.fn();
vi.mock('@/lib/auth/better-auth', () => ({ auth: { api: { getSession } } }));
vi.mock('next/headers', () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

beforeEach(async () => {
  getSession.mockReset();
  await memory.recordBuild('sermons', { version: '1.0.0', sha: 'x', sizeGz: 1, builtAt: 't', blobPath: 'sermons/1.0.0/index.js' });
});

describe('promote action', () => {
  it('rejects when there is no session', async () => {
    getSession.mockResolvedValue(null);
    const { promote } = await import('@/app/admin/releases/actions');
    await expect(promote('sermons', '1.0.0')).rejects.toThrow(/unauthorized/i);
  });

  it('promotes and records the session email as `by`', async () => {
    getSession.mockResolvedValue({ user: { email: 'me@perimeter.org' } });
    const { promote } = await import('@/app/admin/releases/actions');
    await promote('sermons', '1.0.0');
    expect(await memory.getLatest('sermons')).toBe('1.0.0');
    const activity = await memory.listActivity();
    expect(activity[0]).toMatchObject({ action: 'promote', by: 'me@perimeter.org' });
  });
});
```

- [ ] **Step 4: Run to verify it fails** — FAIL.

- [ ] **Step 5: Write `src/app/admin/releases/actions.ts`**

```ts
'use server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/better-auth';
import { releaseStore } from '@/lib/release-store';

async function requireUser(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email) throw new Error('Unauthorized');
  return session.user.email;
}

export async function promote(name: string, version: string): Promise<void> {
  const by = await requireUser();
  await releaseStore().setLatest(name, version, 'promote', by);
  revalidatePath('/admin/releases');
}

export async function rollback(name: string, version: string): Promise<void> {
  const by = await requireUser();
  await releaseStore().setLatest(name, version, 'rollback', by);
  revalidatePath('/admin/releases');
}
```

- [ ] **Step 6: Run to verify it passes** — PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/studio/src/lib/release-store.ts apps/studio/src/app/admin/releases/actions.ts apps/studio/package.json pnpm-lock.yaml apps/studio/tests/release-actions.test.ts
git commit -m "feat(studio): add promote/rollback server actions with session re-check"
```

### Task 16: Release panel (client) + releases page (server)

**Files:**
- Create: `apps/studio/src/app/admin/releases/release-panel.tsx`
- Create: `apps/studio/src/app/admin/releases/page.tsx`
- Modify: `apps/studio/src/app/admin/page.tsx` (link to releases)
- Test: `apps/studio/tests/release-panel.test.tsx`

- [ ] **Step 1: Write the failing test** — the panel renders builds, badges the live one, and fires `promote` with the right args.

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReleasePanel } from '@/app/admin/releases/release-panel';

const builds = [
  { version: '1.1.0', sha: 'bbb', sizeGz: 2048, builtAt: '2026-05-27T00:00:00.000Z', blobPath: 'sermons/1.1.0/index.js' },
  { version: '1.0.0', sha: 'aaa', sizeGz: 1024, builtAt: '2026-05-26T00:00:00.000Z', blobPath: 'sermons/1.0.0/index.js' },
];

describe('ReleasePanel', () => {
  it('badges the live build and promotes another on click', async () => {
    const onPromote = vi.fn().mockResolvedValue(undefined);
    render(<ReleasePanel name="sermons" builds={builds} latest="1.0.0" onPromote={onPromote} onRollback={vi.fn()} />);
    expect(screen.getByText('1.0.0').closest('li')).toHaveTextContent('LATEST');
    await userEvent.click(screen.getByRole('button', { name: /promote 1\.1\.0/i }));
    expect(onPromote).toHaveBeenCalledWith('sermons', '1.1.0');
  });
});
```

> Add `@testing-library/user-event` to `apps/studio` devDependencies if absent (sermons already uses it; confirm and add if needed), then `pnpm install`.

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Write `release-panel.tsx`** (presentational client component; actions injected as props so it is testable without server-action wiring)

```tsx
'use client';
import * as React from 'react';
import type { BuildRecord } from '@perimeter/release-store';

type Props = {
  name: string;
  builds: BuildRecord[];
  latest: string | null;
  onPromote: (name: string, version: string) => Promise<void>;
  onRollback: (name: string, version: string) => Promise<void>;
};

export function ReleasePanel({ name, builds, latest, onPromote, onRollback }: Props): React.JSX.Element {
  const [pending, setPending] = React.useState(false);
  const act = (fn: () => Promise<void>) => () => {
    setPending(true);
    void fn().finally(() => setPending(false));
  };

  return (
    <section className="space-y-2">
      <h2 className="font-medium">{name}</h2>
      <ul className="divide-y divide-border">
        {builds.map((b) => {
          const live = b.version === latest;
          return (
            <li key={b.version} className="flex items-center gap-3 py-2 text-sm">
              <span className="font-mono">{b.version}</span>
              <span className="text-muted-fg">{(b.sizeGz / 1024).toFixed(1)} KB gz</span>
              <span className="text-muted-fg font-mono">{b.sha}</span>
              {live && <span className="rounded bg-fg px-1.5 text-xs text-bg">LATEST</span>}
              <span className="ml-auto">
                {live ? null : (
                  <button
                    disabled={pending}
                    className="rounded-md border border-border px-2 py-1 text-xs"
                    onClick={act(() => (latest ? onRollback(name, b.version) : onPromote(name, b.version)))}
                  >
                    {latest ? `Roll back to ${b.version}` : `Promote ${b.version}`}
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

> Behavior note: the button reads "Promote" when nothing is live yet, otherwise "Roll back to" for older builds and (for the newest non-live build) it is also a promote. Keep the spec's semantics simple — both call `setLatest`; the label is cosmetic. The test above asserts the no-latest case calls `onPromote`. If you prefer always showing "Promote <version>" regardless, simplify the label and update the test to match.

- [ ] **Step 4: Write `page.tsx`** (server component: read store, bind server actions, render a panel per widget)

```tsx
import * as React from 'react';
import { releaseStore } from '@/lib/release-store';
import { promote, rollback } from './actions';
import { ReleasePanel } from './release-panel';

export default async function ReleasesPage(): Promise<React.JSX.Element> {
  const store = releaseStore();
  const widgets = await store.listWidgets();
  // Include widgets that have builds but were never promoted, too.
  const names = Array.from(new Set([...widgets, 'sermons']));
  const panels = await Promise.all(
    names.map(async (name) => ({
      name,
      builds: await store.listBuilds(name),
      latest: await store.getLatest(name),
    })),
  );
  const activity = await store.listActivity();

  return (
    <main className="mx-auto max-w-3xl p-8 space-y-8">
      <h1 className="text-xl font-semibold">Releases</h1>
      {panels
        .filter((p) => p.builds.length > 0)
        .map((p) => (
          <ReleasePanel
            key={p.name}
            name={p.name}
            builds={p.builds}
            latest={p.latest}
            onPromote={promote}
            onRollback={rollback}
          />
        ))}
      <section className="space-y-2">
        <h2 className="font-medium">Activity</h2>
        <ul className="space-y-1 text-sm text-muted-fg">
          {activity.map((a, i) => (
            <li key={i} className="font-mono">
              {a.at} · {a.action} {a.widget}@{a.version} · {a.by}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

> The hardcoded `'sermons'` seed in `names` is a pragmatic way to show a widget's builds before it has ever been promoted (since `listWidgets` only tracks promoted ones). Acceptable for Phase 3's single real widget. If a cleaner enumeration is wanted later, add a `builds`-set key mirroring the `widgets` set on `recordBuild` — out of scope now (YAGNI).

- [ ] **Step 5: Update `src/app/admin/page.tsx`** — replace the placeholder body with a link:

```tsx
import * as React from 'react';
import Link from 'next/link';

export default function AdminPage(): React.JSX.Element {
  return (
    <main className="mx-auto max-w-3xl p-8 space-y-4">
      <h1 className="text-xl font-semibold">Admin</h1>
      <Link className="text-sm underline" href="/admin/releases">
        Releases — promote / rollback
      </Link>
    </main>
  );
}
```

- [ ] **Step 6: Run to verify it passes** — `pnpm --filter @perimeter/studio test` → PASS (panel + middleware + actions).

- [ ] **Step 7: Commit**

```bash
git add apps/studio/src/app/admin pnpm-lock.yaml apps/studio/package.json apps/studio/tests/release-panel.test.tsx
git commit -m "feat(studio): add /admin/releases promote/rollback UI + activity log"
```

---

## Chunk 7: Integration, docs & quality gate

### Task 17: End-to-end memory-driver integration test

**Files:**
- Test: `apps/cdn/tests/integration.test.ts`

- [ ] **Step 1: Write the test** — drive the full lifecycle through one shared memory store: publish → (not live) → promote → latest 302 + manifest → rollback.

```ts
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createStore, createMemoryKv, createMemoryBlob, publishWidget } from '@perimeter/release-store';

const memory = createStore(createMemoryKv(), createMemoryBlob());
vi.mock('@/lib/store', () => ({ releaseStore: () => memory }));

beforeAll(async () => {
  // publish 1.0.0 and 1.1.0 via the orchestration with injected hooks
  for (const version of ['1.0.0', '1.1.0']) {
    await publishWidget(
      { name: 'sermons', force: false },
      {
        store: memory,
        readPackageVersion: () => version,
        gitSha: () => version.replace(/\./g, '').padStart(7, '0'),
        gitBranch: () => 'main',
        build: async () => {},
        readArtifact: (p) => Buffer.from(p.endsWith('.map') ? 'MAP' : `JS-${version}`),
      },
    );
  }
});

describe('hosting lifecycle', () => {
  it('serves nothing until promoted, then 302s to the promoted version, then rolls back', async () => {
    const latest = await import('@/app/api/latest/[name]/route');
    const manifest = await import('@/app/api/manifest/route');

    // not live yet
    let res = await latest.GET(new Request('https://x/sermons/latest.js'), { params: Promise.resolve({ name: 'sermons' }) });
    expect(res.status).toBe(404);
    expect(await (await manifest.GET()).json()).toEqual({});

    // promote 1.1.0
    await memory.setLatest('sermons', '1.1.0', 'promote', 'me@perimeter.org');
    res = await latest.GET(new Request('https://x/sermons/latest.js'), { params: Promise.resolve({ name: 'sermons' }) });
    expect(res.headers.get('location')).toBe('/sermons/1.1.0/index.js');
    expect(await (await manifest.GET()).json()).toEqual({ sermons: '/sermons/latest.js' });

    // rollback to 1.0.0
    await memory.setLatest('sermons', '1.0.0', 'rollback', 'me@perimeter.org');
    res = await latest.GET(new Request('https://x/sermons/latest.js'), { params: Promise.resolve({ name: 'sermons' }) });
    expect(res.headers.get('location')).toBe('/sermons/1.0.0/index.js');

    // the versioned bytes for both still exist
    const v100 = await import('@/app/api/bundle/[name]/[version]/route');
    const r = await v100.GET(new Request('https://x/sermons/1.0.0/index.js'), { params: Promise.resolve({ name: 'sermons', version: '1.0.0' }) });
    expect(await r.text()).toBe('JS-1.0.0');
  });
});
```

- [ ] **Step 2: Run to verify it passes** — `pnpm --filter @perimeter/cdn test` → PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/cdn/tests/integration.test.ts
git commit -m "test(cdn): end-to-end publish → promote → rollback lifecycle"
```

### Task 18: Docs — embed guide, env, provisioning

**Files:**
- Create: `apps/cdn/README.md` (serving contract + provisioning checklist)
- Create: `.env.example` entries (document required env in each app's README or a root `docs/` note)
- Modify: `perimeter-widgets/CLAUDE.md` (Status section → Phase 3 landed; add publish/promote workflow)

- [ ] **Step 1: Write `apps/cdn/README.md`** documenting: the route table (versioned/latest/manifest + cache headers), the embed snippet, the env vars (`KV_REST_API_URL`, `KV_REST_API_TOKEN`, `BLOB_READ_WRITE_TOKEN`, `BLOB_PUBLIC_BASE_URL`, `RELEASE_STORE_DRIVER=memory` for local), and the Vercel provisioning checklist from the spec (create Blob store; bind tokens; confirm KV vars; point domain at `widgets.perimeter.org`).

- [ ] **Step 2: Document Studio admin env** in `apps/studio` (README or a comment block): `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `MP_API_BASEURL`, `MP_API_CLIENT`, `MP_API_SECRET`, plus the release-store vars, plus the MP OAuth redirect URI `https://studio.perimeter.org/api/auth/callback/ministryplatform`.

- [ ] **Step 3: Update `CLAUDE.md`** Status + add the release workflow: `pnpm publish-widget <name>` then promote at `/admin/releases`.

- [ ] **Step 4: Commit**

```bash
git add apps/cdn/README.md apps/studio CLAUDE.md
git commit -m "docs(widgets): document CDN serving, release workflow, and provisioning"
```

### Task 19: Full quality gate

- [ ] **Step 1: Run the repo gate** — `pnpm quality`
Expected: typecheck + lint + test green across all packages including the two new ones; prettier clean. If prettier flags new files, run `pnpm format` and commit the formatting.

- [ ] **Step 2: Fix any failures**, re-run until green.

- [ ] **Step 3: Commit** any formatting/lint fixups

```bash
git add -A
git commit -m "chore(widgets): formatting + lint fixups for Phase 3"
```

---

## Out of scope (do NOT build — deferred)

- `loader.js` (global page-scan loader) — until widget #2.
- GitHub Actions automation — Phase 4 (the `publish-widget` script is the seam).
- WordPress cutover + jsDelivr retirement — Phase 4.
- Stable nuqs URL prefix — task #49 (Phase 4 gate).
- react-pdf worker self-hosting — task #50.
- Upstash `REDIS_URL`-only adapter — only if provisioning reveals the store lacks KV REST vars.

## Definition of done

1. `pnpm quality` green (all packages, including `@perimeter/release-store` and `@perimeter/cdn`).
2. `RELEASE_STORE_DRIVER=memory pnpm publish-widget sermons` runs the build→upload→record pipeline without error.
3. CDN routes verified by tests: immutable headers on versioned, 302 on `latest.js`, manifest reflects pointers, 404s where expected.
4. `/admin/*` redirects unauthenticated users to `/admin/login`; promote/rollback server actions reject when there is no session and record the session email otherwise.
5. The end-to-end integration test (publish → promote → rollback) passes.
6. Provisioning + env documented; `CLAUDE.md` status updated.
