# Perimeter Widgets — Phase 2 Sermons Port Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the legacy sermons widget (`legacy/v1` branch) onto the new Phase 1 platform; produce a single-IIFE `dist/sermons/sermons.iife.js` under 500 KB gzipped that renders in Studio with behavioral parity to legacy.

**Architecture:** Adds two shared workspace packages — `@perimeter/api-types` (codegen'd OpenAPI types from a vendored `spec.yaml`) and `@perimeter/api-hooks` (typed React Query hooks for sermons endpoints) — and a new `widgets/sermons` package that consumes both. Sermons is refactored during the port to drill `config` as a prop rather than use a `useConfig()` hook. URL filter state via nuqs is preserved with an element-id-derived prefix to harden multi-embed pages.

**Tech Stack:** pnpm 10.x, Node 22+, Turborepo 2.x, TypeScript 5.x (strict + `exactOptionalPropertyTypes`), Vite 6.x library mode, React 19, Tailwind v3 via `@perimeter/theme/tailwind`, zod, TanStack Query 5.x, nuqs, framer-motion, HLS.js, react-pdf, luxon, @headlessui/react, lucide-react, Vitest 2.x + jsdom, openapi-typescript.

**Source spec:** `docs/superpowers/specs/2026-05-26-perimeter-widgets-phase-2-sermons-port-design.md`
**Umbrella:** `docs/superpowers/specs/2026-05-22-perimeter-widgets-rebuild-design.md`
**Phase 1 (complete):** `docs/superpowers/specs/2026-05-22-perimeter-widgets-phase-1-foundation-design.md`

**Legacy widget source:** `legacy/v1` branch at `widgets/sermons/` (61 files). The port copies most files unchanged and adjusts only what the new platform requires. Copy commands use `git show legacy/v1:<path> > <new-path>` so the legacy file is read directly from git without checking out the branch.

**Carry-forward conventions from Phase 1 — must follow:**
- Per-package `package.json` declares `lint`, `typecheck`, `test`, and (if applicable) `build` scripts. `build = echo "(no-op)"` for non-buildable packages.
- Per-package `tsconfig.json` extends `../../tsconfig.base.json` and includes `src/**/*` + `tests/**/*`.
- Optional interface fields use `field?: T | undefined` (required by `exactOptionalPropertyTypes`).
- JSX files use `.tsx`; pure-TS files use `.ts`.
- Test files don't `import * as React from 'react'` unless they reference `React.*` types directly.
- No `any` in `src/`; tests can use it (ESLint test-files override).
- No `eslint-disable` comments. Fix the underlying code or extend the test-files override in `eslint.config.js`.
- Commit messages via temp file (`Write` tool → `git commit -F /tmp/<file>`), never inline `-m`. Use conventional prefixes (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, `ci:`).
- **No `git push`.** The user has forbidden pushing. All work stays local on `docs/widgets-rebuild-design`.
- Node 26 + jsdom workaround: `vitest.config.ts` for any package using jsdom needs `poolOptions.{threads,forks}.execArgv: ['--no-experimental-webstorage']`. CI runs Node 22 where the flag is a no-op.

---

## File Structure Overview

Final layout after Phase 2:

```
perimeter-widgets/
├── packages/
│   ├── api-types/                       # NEW
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   ├── spec/spec.yaml               # vendored from perimeter-api
│   │   ├── scripts/generate.ts          # runs openapi-typescript
│   │   ├── src/
│   │   │   ├── index.ts                 # re-exports
│   │   │   └── operations.ts            # GENERATED
│   │   └── tests/imports.test.ts        # smoke test
│   └── api-hooks/                       # NEW
│       ├── package.json
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       ├── tests/setup.ts
│       ├── src/
│       │   ├── index.ts
│       │   ├── internal/serialize-query.ts
│       │   └── sermons/
│       │       ├── use-sermons.ts
│       │       ├── use-sermon-detail.ts
│       │       ├── use-series.ts
│       │       ├── use-series-detail.ts
│       │       ├── use-speakers.ts
│       │       ├── use-books.ts
│       │       ├── use-service-types.ts
│       │       ├── use-series-types.ts
│       │       └── use-sermon-facets.ts
│       └── tests/
│           ├── internal/serialize-query.test.ts
│           └── sermons/                 # ported from legacy
│               ├── use-sermons.test.tsx
│               ├── use-sermon-detail.test.tsx
│               ├── use-series.test.tsx
│               ├── use-series-detail.test.tsx
│               ├── use-speakers.test.tsx
│               ├── use-books.test.tsx
│               ├── use-service-types.test.tsx
│               ├── use-series-types.test.tsx
│               └── use-sermon-facets.test.tsx
└── widgets/sermons/                     # NEW
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── vitest.config.ts
    ├── tailwind.config.ts
    ├── postcss.config.js
    └── src/
        ├── index.tsx                    # defineWidget()
        ├── App.tsx                      # refactored: config drilled as prop
        ├── types.ts                     # SermonsConfig + zod (ported)
        ├── styles.css
        ├── lib/
        │   ├── format.ts                # ported as-is
        │   ├── pagination.ts            # ported as-is
        │   └── bible-books.ts           # ported as-is
        ├── hooks/                       # widget-internal only
        │   ├── use-sermon-filters.ts    # nuqs URL state + config-pinned filters
        │   ├── use-media-player.ts
        │   └── use-filter-label-cache.ts
        ├── components/
        │   ├── SermonTabs.tsx
        │   ├── sermons/
        │   │   ├── SermonsView.tsx
        │   │   ├── SermonDetail.tsx
        │   │   ├── SermonGrid.tsx
        │   │   ├── SermonFilters.tsx
        │   │   ├── SermonInfo.tsx
        │   │   ├── SermonLargeList.tsx
        │   │   └── SermonSmallList.tsx
        │   ├── series/
        │   │   ├── SeriesView.tsx
        │   │   ├── SeriesDetail.tsx
        │   │   └── SeriesGrid.tsx
        │   ├── players/
        │   │   ├── AudioPlayer.tsx
        │   │   ├── VideoPlayer.tsx      # HLS.js
        │   │   ├── PdfViewer.tsx        # react-pdf
        │   │   └── MediaTabs.tsx
        │   └── ui/
        │       ├── DatePicker.tsx
        │       ├── DateRangePicker.tsx
        │       ├── ImagePlaceholder.tsx
        │       ├── MediaCard.tsx
        │       └── Modal.tsx
    └── tests/
        ├── App.test.tsx
        ├── types.test.ts
        ├── bundle.test.ts               # NEW: 500 KB budget
        ├── lib/
        │   ├── format.test.ts
        │   └── pagination.test.ts
        ├── hooks/
        │   ├── use-sermon-filters.test.tsx
        │   └── use-filter-label-cache.test.tsx
        └── components/
            ├── SermonGrid.test.tsx
            ├── SermonFilters.test.tsx
            └── players/PdfViewer.test.tsx
```

---

## Plan Chunks

1. **Chunk 1** — Pre-port spec budget updates; `@perimeter/api-types` package (vendored spec + codegen).
2. **Chunk 2** — `@perimeter/api-hooks` scaffold + `serializeQuery` helper + first three hooks (sermons, sermon-detail, series).
3. **Chunk 3** — `@perimeter/api-hooks` remaining six hooks + tests relocated from legacy.
4. **Chunk 4** — `widgets/sermons` scaffold + types + lib utilities + their tests.
5. **Chunk 5** — `widgets/sermons` widget-internal hooks (filters, media player, label cache).
6. **Chunk 6** — `widgets/sermons` UI primitives + non-detail components (Tabs, grids, lists).
7. **Chunk 7** — `widgets/sermons` filters, detail views, and media players.
8. **Chunk 8** — `widgets/sermons` App + entry + integration test + bundle test.
9. **Chunk 9** — Studio integration + final acceptance walk.

Each chunk ends with one or two conventional commits.

---

## Chunk 1: Spec budget updates + `@perimeter/api-types` package

**Outcome:** The umbrella + Phase 1 specs reflect the 500 KB per-widget budget. `@perimeter/api-types` exists with a vendored OpenAPI spec, a codegen script, and a generated `operations.ts` typed against the perimeter-api sermons surface. `pnpm quality` exit 0.

### Task 1.1: Bump bundle budget in specs to 500 KB

**Files:**
- Modify: `docs/superpowers/specs/2026-05-22-perimeter-widgets-rebuild-design.md`
- Modify: `docs/superpowers/specs/2026-05-22-perimeter-widgets-phase-1-foundation-design.md`

- [ ] **Step 1.1.1:** In the umbrella spec, find the Risks-table row for "Bundle size growth with all-React-bundled-in" and replace the "220 KB gzipped" reference with **"500 KB gzipped"**. The current text mentions React 19 + ReactDOM + TanStack Query + zod + runtime weighing ~200 KB gz; the new line should acknowledge that sermons (with react-pdf + HLS.js + framer-motion + luxon + nuqs + headlessui + lucide-react) is the basis for the raise.

- [ ] **Step 1.1.2:** In the Phase 1 spec, find the two occurrences of "220 KB" (acceptance criterion #2 and the Risks row). Replace each with "500 KB". Add a parenthetical "(raised in Phase 2 after measuring sermons)" to the Risks row.

- [ ] **Step 1.1.3:** Commit. Write message to `/tmp/commit-phase2-1.txt`:

  ```
  docs(specs): raise per-widget bundle budget from 220 KB to 500 KB

  Sermons (Phase 2) bundles react-pdf, HLS.js, luxon, framer-motion,
  nuqs, headlessui, and lucide-react in addition to the Phase 1 stack.
  Empirically the sermons-class widget lands well above 220 KB.
  Raising the budget to 500 KB matches the Phase 2 spec.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

  Then: `git add docs/superpowers/specs && git commit -F /tmp/commit-phase2-1.txt && rm /tmp/commit-phase2-1.txt`.

### Task 1.2: Scaffold `@perimeter/api-types`

**Files:**
- Create: `packages/api-types/package.json`
- Create: `packages/api-types/tsconfig.json`
- Create: `packages/api-types/vitest.config.ts`
- Create: `packages/api-types/src/index.ts`

- [ ] **Step 1.2.1:** Create `packages/api-types/package.json`:

  ```json
  {
    "name": "@perimeter/api-types",
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
      "generate": "tsx scripts/generate.ts",
      "sync": "cp ../../../perimeter-api/openapi/spec.yaml spec/spec.yaml && pnpm generate"
    },
    "devDependencies": {
      "@vitest/coverage-v8": "^2.1.8",
      "openapi-typescript": "^7.5.0",
      "tsx": "^4.19.2",
      "typescript": "^5.7.3",
      "vitest": "^2.1.8"
    }
  }
  ```

- [ ] **Step 1.2.2:** Create `packages/api-types/tsconfig.json`:

  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": { "rootDir": ".", "noEmit": true },
    "include": ["src/**/*", "tests/**/*", "scripts/**/*"]
  }
  ```

- [ ] **Step 1.2.3:** Create `packages/api-types/vitest.config.ts`:

  ```ts
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  });
  ```

- [ ] **Step 1.2.4:** Create an empty stub `packages/api-types/src/index.ts`:

  ```ts
  export {};
  ```

- [ ] **Step 1.2.5:** From repo root, install: `pnpm install`. Expected: workspace package picked up; new devDeps installed.

### Task 1.3: Vendor the OpenAPI spec from perimeter-api

**Files:**
- Create: `packages/api-types/spec/spec.yaml`
- Create: `packages/api-types/spec/README.md`

- [ ] **Step 1.3.1:** Copy the OpenAPI spec into the workspace. Run from repo root:

  ```bash
  mkdir -p packages/api-types/spec
  cp ../perimeter-api/openapi/spec.yaml packages/api-types/spec/spec.yaml
  ```

  Expected: file copied. The sibling `perimeter-api` repo must be present at `../perimeter-api/`. If it isn't, the developer needs to clone it or fetch a copy of `spec.yaml` manually.

- [ ] **Step 1.3.2:** Write `packages/api-types/spec/README.md`:

  ```markdown
  # Vendored OpenAPI spec

  The file `spec.yaml` in this directory is a vendored copy of
  `perimeter-api/openapi/spec.yaml` from the sibling `perimeter-api`
  repository.

  CI generates `src/operations.ts` from this vendored copy. The
  `pnpm sync` script in this package copies the upstream spec over
  the vendored copy and re-runs codegen — run it when the perimeter-api
  schema changes.
  ```

### Task 1.4: Codegen script + generated types

**Files:**
- Create: `packages/api-types/scripts/generate.ts`
- Create: `packages/api-types/src/operations.ts` (generated)

- [ ] **Step 1.4.1:** Create `packages/api-types/scripts/generate.ts`:

  ```ts
  import { spawnSync } from 'node:child_process';
  import path from 'node:path';

  const here = path.dirname(new URL(import.meta.url).pathname);
  const spec = path.resolve(here, '../spec/spec.yaml');
  const out = path.resolve(here, '../src/operations.ts');

  const result = spawnSync(
    'npx',
    ['openapi-typescript', spec, '-o', out],
    { stdio: 'inherit' },
  );
  process.exit(result.status ?? 1);
  ```

- [ ] **Step 1.4.2:** Generate the types:

  Run: `pnpm --filter @perimeter/api-types generate`
  Expected: `packages/api-types/src/operations.ts` is created. The file is large (~thousands of lines) — this is normal for an OpenAPI codegen output. Do not edit it by hand.

- [ ] **Step 1.4.3:** Update `packages/api-types/src/index.ts` to re-export:

  ```ts
  export type { operations, components, paths } from './operations';
  ```

### Task 1.5: Verify codegen + smoke test

**Files:**
- Create: `packages/api-types/tests/imports.test.ts`

- [ ] **Step 1.5.1:** Write `packages/api-types/tests/imports.test.ts`. Asserts the key operation types we expect to find — fails loudly if the API renames or removes a sermons operation. (Test doubles as a sanity check on the codegen output and as documentation of which operations the new platform depends on.)

  ```ts
  import { describe, it, expectTypeOf } from 'vitest';
  import type { operations } from '../src';

  describe('codegen sermons operations', () => {
    it('exposes the sermons-related operation ids', () => {
      // Compile-time check: each must exist on the generated `operations` type.
      type Required = keyof operations;
      expectTypeOf<'listSermons'>().toMatchTypeOf<Required>();
      expectTypeOf<'getSermon'>().toMatchTypeOf<Required>();
      expectTypeOf<'listSeries'>().toMatchTypeOf<Required>();
      expectTypeOf<'getSeriesDetail'>().toMatchTypeOf<Required>();
      expectTypeOf<'listSpeakers'>().toMatchTypeOf<Required>();
      expectTypeOf<'listBooks'>().toMatchTypeOf<Required>();
      expectTypeOf<'listServiceTypes'>().toMatchTypeOf<Required>();
      expectTypeOf<'listSeriesTypes'>().toMatchTypeOf<Required>();
    });
  });
  ```

  Note: if any of these operation ids has been renamed in perimeter-api, the test fails with a TS error and the planner must look at the actual `operations.ts` to find the new names. These eight ids were verified in `perimeter-api/openapi/spec.yaml` as of the spec date. **There is no `getSermonFacets` / `listSermonFacets` operation** — facets are a derived/composite concept in the widget, not a backend endpoint.

- [ ] **Step 1.5.2:** Run the test:

  Run: `pnpm --filter @perimeter/api-types test`
  Expected: PASS (`Test Files 1 passed (1)`, 1 test).

  If FAIL with type errors for missing operation ids: pause and report which names changed. The planner adapts subsequent chunks to use the new names.

- [ ] **Step 1.5.3:** Run package quality:

  Run: `pnpm --filter @perimeter/api-types lint && pnpm --filter @perimeter/api-types typecheck && pnpm --filter @perimeter/api-types test`
  Expected: exits 0.

- [ ] **Step 1.5.4:** Repo-wide quality:

  Run: `pnpm quality`
  Expected: exits 0.

- [ ] **Step 1.5.4a:** Pre-flight grep on the generated file. The eight expected operation ids should appear at least once each (each as `operationId: "<name>"` in the OpenAPI-derived comment or as an `operations` key):

  Run:
  ```bash
  for op in listSermons getSermon listSeries getSeriesDetail listSpeakers listBooks listServiceTypes listSeriesTypes; do
    grep -q "$op" packages/api-types/src/operations.ts && echo "OK $op" || echo "MISSING $op"
  done
  ```
  Expected: 8 lines, all "OK". Any "MISSING" line means the OpenAPI spec renamed/removed that operation — pause and surface to the user before proceeding.

- [ ] **Step 1.5.5:** Commit. Write `/tmp/commit-phase2-1b.txt`:

  ```
  feat(api-types): add @perimeter/api-types package with codegen'd OpenAPI

  Vendors perimeter-api/openapi/spec.yaml into packages/api-types/spec/
  so CI codegen is deterministic. A pnpm sync script copies the upstream
  spec on demand; pnpm generate runs openapi-typescript to produce
  src/operations.ts (committed).

  Smoke test verifies the eight sermons-related operation ids are
  present, so a rename in perimeter-api fails CI loudly.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

  Then: `git add packages/api-types pnpm-lock.yaml && git commit -F /tmp/commit-phase2-1b.txt && rm /tmp/commit-phase2-1b.txt`.

### Chunk 1 acceptance

- Spec files updated; budget references say 500 KB.
- `packages/api-types/` exists with vendored `spec.yaml`, generated `src/operations.ts`, and one passing test.
- `pnpm quality` exits 0.
- Two new commits since previous branch tip.

---

## Chunk 2: `@perimeter/api-hooks` scaffold + serializeQuery + first three hooks

**Outcome:** `@perimeter/api-hooks` package exists with `serializeQuery` helper and three typed React Query hooks (`useSermons`, `useSermonDetail`, `useSeries`). Hooks consume `useApiClient()` from the runtime. Tests for `serializeQuery` and the three hooks pass.

### Task 2.1: Scaffold

**Files:**
- Create: `packages/api-hooks/package.json`
- Create: `packages/api-hooks/tsconfig.json`
- Create: `packages/api-hooks/vitest.config.ts`
- Create: `packages/api-hooks/tests/setup.ts`
- Create: `packages/api-hooks/src/index.ts` (empty stub)

- [ ] **Step 2.1.1:** Create `packages/api-hooks/package.json`:

  ```json
  {
    "name": "@perimeter/api-hooks",
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
      "test": "vitest run"
    },
    "dependencies": {
      "@perimeter/api-types": "workspace:*",
      "@perimeter/widget-runtime": "workspace:*"
    },
    "peerDependencies": {
      "@tanstack/react-query": "^5.62.0",
      "react": "^19.0.0"
    },
    "devDependencies": {
      "@tanstack/react-query": "^5.62.7",
      "@testing-library/jest-dom": "^6.6.3",
      "@testing-library/react": "^16.1.0",
      "@types/react": "^19.0.7",
      "@types/react-dom": "^19.0.3",
      "@vitest/coverage-v8": "^2.1.8",
      "jsdom": "^25.0.1",
      "react": "^19.0.0",
      "react-dom": "^19.0.0",
      "typescript": "^5.7.3",
      "vitest": "^2.1.8"
    }
  }
  ```

- [ ] **Step 2.1.2:** Create `packages/api-hooks/tsconfig.json`:

  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": { "rootDir": ".", "noEmit": true },
    "include": ["src/**/*", "tests/**/*"]
  }
  ```

- [ ] **Step 2.1.3:** Create `packages/api-hooks/vitest.config.ts` (with Node-26 jsdom workaround):

  ```ts
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.{ts,tsx}'],
      setupFiles: ['./tests/setup.ts'],
      poolOptions: {
        threads: { execArgv: ['--no-experimental-webstorage'] },
        forks:   { execArgv: ['--no-experimental-webstorage'] },
      },
    },
  });
  ```

- [ ] **Step 2.1.4:** Create `packages/api-hooks/tests/setup.ts`:

  ```ts
  import '@testing-library/jest-dom/vitest';
  import { afterEach } from 'vitest';
  import { cleanup } from '@testing-library/react';
  afterEach(() => { cleanup(); });
  ```

- [ ] **Step 2.1.5:** Create empty stub `packages/api-hooks/src/index.ts`:

  ```ts
  export {};
  ```

- [ ] **Step 2.1.6:** Install: `pnpm install`.

### Task 2.2: `serializeQuery` helper — failing tests first

**Files:**
- Create: `packages/api-hooks/tests/internal/serialize-query.test.ts`

- [ ] **Step 2.2.1:** Write the failing test:

  ```ts
  import { describe, it, expect } from 'vitest';
  import { serializeQuery } from '../../src/internal/serialize-query';

  describe('serializeQuery', () => {
    it('returns empty string for empty input', () => {
      expect(serializeQuery({})).toBe('');
    });

    it('skips undefined and null values', () => {
      expect(serializeQuery({ a: undefined, b: null, c: 'keep' })).toBe('c=keep');
    });

    it('coerces numbers and booleans to strings', () => {
      expect(serializeQuery({ page: 3, active: true, ratio: 0.5 })).toBe(
        'page=3&active=true&ratio=0.5',
      );
    });

    it('encodes arrays as repeated keys', () => {
      expect(serializeQuery({ speakerId: [1, 2, 3] })).toBe(
        'speakerId=1&speakerId=2&speakerId=3',
      );
    });

    it('encodes Date as YYYY-MM-DD', () => {
      const d = new Date('2026-03-15T12:34:56Z');
      expect(serializeQuery({ from: d })).toBe('from=2026-03-15');
    });

    it('url-encodes values with special characters', () => {
      expect(serializeQuery({ q: 'a & b' })).toBe('q=a%20%26%20b');
    });

    it('preserves insertion order of keys', () => {
      expect(serializeQuery({ z: '1', a: '2' })).toBe('z=1&a=2');
    });

    it('drops empty arrays', () => {
      expect(serializeQuery({ tags: [] as string[], keep: 'yes' })).toBe('keep=yes');
    });
  });
  ```

- [ ] **Step 2.2.2:** Run the test:

  Run: `pnpm --filter @perimeter/api-hooks test`
  Expected: FAIL — `Cannot find module '../../src/internal/serialize-query'`.

### Task 2.3: `serializeQuery` implementation

**Files:**
- Create: `packages/api-hooks/src/internal/serialize-query.ts`

- [ ] **Step 2.3.1:** Create the implementation:

  ```ts
  /**
   * Serialize a typed query-params object into a URLSearchParams-compatible
   * string. Skips undefined/null; coerces primitives; encodes arrays as
   * repeated keys; encodes Date as YYYY-MM-DD.
   */
  export type QueryValue =
    | string
    | number
    | boolean
    | Date
    | null
    | undefined
    | ReadonlyArray<string | number | boolean>;

  export function serializeQuery(params: Record<string, QueryValue>): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        for (const item of value) parts.push(`${enc(key)}=${enc(item)}`);
        continue;
      }
      if (value instanceof Date) {
        parts.push(`${enc(key)}=${enc(toIsoDate(value))}`);
        continue;
      }
      parts.push(`${enc(key)}=${enc(value)}`);
    }
    return parts.join('&');
  }

  function enc(v: string | number | boolean): string {
    return encodeURIComponent(String(v));
  }

  function toIsoDate(d: Date): string {
    const yyyy = d.getUTCFullYear().toString().padStart(4, '0');
    const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const dd = d.getUTCDate().toString().padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  ```

- [ ] **Step 2.3.2:** Re-run tests:

  Run: `pnpm --filter @perimeter/api-hooks test`
  Expected: PASS — all 8 `serializeQuery` assertions green.

### Task 2.4: `useSermons` — failing test first

**Files:**
- Create: `packages/api-hooks/tests/sermons/use-sermons.test.tsx`

- [ ] **Step 2.4.1:** Copy the legacy hook test as a starting point, then adjust imports:

  ```bash
  mkdir -p packages/api-hooks/tests/sermons
  git show legacy/v1:widgets/sermons/src/__tests__/hooks/use-sermons.test.tsx \
    > packages/api-hooks/tests/sermons/use-sermons.test.tsx
  ```

- [ ] **Step 2.4.2:** **Rewrite the test from scratch** rather than mechanically porting the legacy one. The shape gap is too large to adjust mechanically:

  - Legacy uses MSW (`setupServer`, `http.get`) + a `config: testConfig` argument with `apiUrl` baked in.
  - The new hook has no `config`/`apiUrl`; it consumes `useApiClient()` from `@perimeter/widget-runtime`.
  - Legacy hook signature accepted `SermonsConfig`; the new signature accepts `UseSermonsParams` (the OpenAPI-derived query shape).
  - `@perimeter/api-hooks` does not depend on MSW.

  Cover these behaviors (matching legacy's coverage of `useSermons`):

  1. Hook calls `client.fetch('/api/sermons?...')` with the URL built from `serializeQuery(params)`.
  2. Response JSON is returned to the caller.
  3. Non-2xx response throws `Error("Sermons request failed: <status>")`.
  4. The React Query `queryKey` includes the params (so two different param objects don't share a cache slot).

  Test scaffold to use:

  ```tsx
  import { describe, it, expect, vi } from 'vitest';
  import { renderHook, waitFor } from '@testing-library/react';
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
  import { ApiClientContext } from '@perimeter/widget-runtime';
  import { useSermons } from '../../src/sermons/use-sermons';
  import type { ApiClient } from '@perimeter/api-client';

  function mockApi(fetchImpl: (path: string, init?: RequestInit) => Promise<Response>): ApiClient {
    return { fetch: vi.fn(fetchImpl) };
  }

  function wrap(client: ApiClient) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
      <ApiClientContext.Provider value={client}>
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      </ApiClientContext.Provider>
    );
  }
  // ...tests
  ```

  The same scaffold is used for every hook test in Chunk 2/3. Extract it into `packages/api-hooks/tests/internal/wrap.tsx` if duplication grates.

- [ ] **Step 2.4.3:** Run the test:

  Run: `pnpm --filter @perimeter/api-hooks test -- sermons/use-sermons`
  Expected: FAIL — module not found for `../../src/sermons/use-sermons`.

### Task 2.5: `useSermons` implementation

**Files:**
- Create: `packages/api-hooks/src/sermons/use-sermons.ts`

- [ ] **Step 2.5.1:** Create `packages/api-hooks/src/sermons/use-sermons.ts`:

  ```ts
  import type { operations } from '@perimeter/api-types';
  import { useQuery, type UseQueryResult } from '@tanstack/react-query';
  import { useApiClient } from '@perimeter/widget-runtime';
  import { serializeQuery, type QueryValue } from '../internal/serialize-query';

  export type UseSermonsParams = operations['listSermons']['parameters']['query'];
  export type UseSermonsResponse =
    operations['listSermons']['responses']['200']['content']['application/json'];

  export function useSermons(params: UseSermonsParams): UseQueryResult<UseSermonsResponse> {
    const client = useApiClient();
    return useQuery({
      queryKey: ['sermons', params],
      queryFn: async () => {
        const search = serializeQuery(params as unknown as Record<string, QueryValue>);
        const res = await client.fetch(`/api/sermons${search ? `?${search}` : ''}`);
        if (!res.ok) throw new Error(`Sermons request failed: ${res.status}`);
        return (await res.json()) as UseSermonsResponse;
      },
    });
  }
  ```

- [ ] **Step 2.5.2:** Re-run the test:

  Run: `pnpm --filter @perimeter/api-hooks test -- sermons/use-sermons`
  Expected: PASS.

### Task 2.6: `useSermonDetail` — TDD

**Files:**
- Create: `packages/api-hooks/tests/sermons/use-sermon-detail.test.tsx`
- Create: `packages/api-hooks/src/sermons/use-sermon-detail.ts`

- [ ] **Step 2.6.1:** Copy + adjust the legacy test:

  ```bash
  git show legacy/v1:widgets/sermons/src/__tests__/hooks/use-sermon-detail.test.tsx \
    > packages/api-hooks/tests/sermons/use-sermon-detail.test.tsx
  ```

  As with `useSermons` (Task 2.4.2), **write this test from scratch** using the same wrap-helper scaffold. Cover: URL `/api/sermons/sermon/${id}` is fetched; JSON returned; error throws; query key includes id; hook is disabled when id ≤ 0 (no fetch).

- [ ] **Step 2.6.2:** Confirm FAIL:

  Run: `pnpm --filter @perimeter/api-hooks test -- sermons/use-sermon-detail`
  Expected: FAIL — module not found.

- [ ] **Step 2.6.3:** Create the impl:

  ```ts
  import type { operations } from '@perimeter/api-types';
  import { useQuery, type UseQueryResult } from '@tanstack/react-query';
  import { useApiClient } from '@perimeter/widget-runtime';

  export type UseSermonDetailResponse =
    operations['getSermon']['responses']['200']['content']['application/json'];

  export function useSermonDetail(id: number): UseQueryResult<UseSermonDetailResponse> {
    const client = useApiClient();
    return useQuery({
      queryKey: ['sermon', id],
      queryFn: async () => {
        const res = await client.fetch(`/api/sermons/sermon/${id}`);
        if (!res.ok) throw new Error(`Sermon detail request failed: ${res.status}`);
        return (await res.json()) as UseSermonDetailResponse;
      },
      enabled: Number.isFinite(id) && id > 0,
    });
  }
  ```

- [ ] **Step 2.6.4:** Re-run: PASS expected.

### Task 2.7: `useSeries` — TDD

**Files:**
- Create: `packages/api-hooks/tests/sermons/use-series.test.tsx`
- Create: `packages/api-hooks/src/sermons/use-series.ts`

- [ ] **Step 2.7.1:** Copy + adjust:

  ```bash
  git show legacy/v1:widgets/sermons/src/__tests__/hooks/use-series.test.tsx \
    > packages/api-hooks/tests/sermons/use-series.test.tsx
  ```

  Same rewrite-from-scratch approach as Task 2.4.2. Cover: URL `/api/sermons/series?...`; JSON returned; error throws; query key includes params.

- [ ] **Step 2.7.2:** Confirm FAIL. Run: `pnpm --filter @perimeter/api-hooks test -- sermons/use-series`. Expected: FAIL.

- [ ] **Step 2.7.3:** Create `packages/api-hooks/src/sermons/use-series.ts`:

  ```ts
  import type { operations } from '@perimeter/api-types';
  import { useQuery, type UseQueryResult } from '@tanstack/react-query';
  import { useApiClient } from '@perimeter/widget-runtime';
  import { serializeQuery, type QueryValue } from '../internal/serialize-query';

  export type UseSeriesParams = operations['listSeries']['parameters']['query'];
  export type UseSeriesResponse =
    operations['listSeries']['responses']['200']['content']['application/json'];

  export function useSeries(params: UseSeriesParams): UseQueryResult<UseSeriesResponse> {
    const client = useApiClient();
    return useQuery({
      queryKey: ['series', params],
      queryFn: async () => {
        const search = serializeQuery(params as unknown as Record<string, QueryValue>);
        const res = await client.fetch(`/api/sermons/series${search ? `?${search}` : ''}`);
        if (!res.ok) throw new Error(`Series request failed: ${res.status}`);
        return (await res.json()) as UseSeriesResponse;
      },
    });
  }
  ```

- [ ] **Step 2.7.4:** Re-run. Expected: PASS.

### Task 2.8: Update package index + quality + commit

**Files:**
- Modify: `packages/api-hooks/src/index.ts`

- [ ] **Step 2.8.1:** Update `packages/api-hooks/src/index.ts`:

  ```ts
  export { useSermons, type UseSermonsParams, type UseSermonsResponse } from './sermons/use-sermons';
  export { useSermonDetail, type UseSermonDetailResponse } from './sermons/use-sermon-detail';
  export { useSeries, type UseSeriesParams, type UseSeriesResponse } from './sermons/use-series';
  ```

- [ ] **Step 2.8.2:** Run package quality:

  Run: `pnpm --filter @perimeter/api-hooks lint && pnpm --filter @perimeter/api-hooks typecheck && pnpm --filter @perimeter/api-hooks test`
  Expected: exits 0. Test count: 8 (serialize) + 3 hooks tests with N assertions each.

- [ ] **Step 2.8.3:** Repo-wide `pnpm quality`. Expected: exits 0.

- [ ] **Step 2.8.4:** Commit. Write `/tmp/commit-phase2-2.txt`:

  ```
  feat(api-hooks): add @perimeter/api-hooks scaffold + first three hooks

  serializeQuery helper handles undefined/null skipping, numeric/boolean
  coercion, repeated-key arrays, ISO date encoding. useSermons,
  useSermonDetail, and useSeries follow the same shape: typed query
  params from @perimeter/api-types, response decoded from JSON, errors
  thrown for non-2xx. Hook tests ported from the legacy widget;
  signatures adjusted to drop the legacy `config` param.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

  Then: `git add packages/api-hooks pnpm-lock.yaml && git commit -F /tmp/commit-phase2-2.txt && rm /tmp/commit-phase2-2.txt`.

### Chunk 2 acceptance

- `@perimeter/api-hooks` exists with `serializeQuery` + three hooks + tests passing.
- `pnpm quality` exits 0.

---

## Chunk 3: `@perimeter/api-hooks` remaining six hooks

**Outcome:** All nine sermons-endpoint hooks exist with ported tests. Public API surface of `@perimeter/api-hooks` is complete.

### Task 3.1: `useSeriesDetail` — TDD

**Files:**
- Create: `packages/api-hooks/tests/sermons/use-series-detail.test.tsx`
- Create: `packages/api-hooks/src/sermons/use-series-detail.ts`

- [ ] **Step 3.1.1:** Write the test from scratch (same approach as Task 2.4.2 — legacy test uses MSW + `config`, which don't translate). Cover: URL `/api/sermons/series/${id}`; JSON returned; error throws; disabled when id ≤ 0. Use the wrap-helper scaffold from Chunk 2.

  Note: no legacy file copy is needed for Chunk 3 — every hook test is written fresh.

- [ ] **Step 3.1.2:** Confirm FAIL. Create the impl:

  ```ts
  import type { operations } from '@perimeter/api-types';
  import { useQuery, type UseQueryResult } from '@tanstack/react-query';
  import { useApiClient } from '@perimeter/widget-runtime';

  export type UseSeriesDetailResponse =
    operations['getSeriesDetail']['responses']['200']['content']['application/json'];

  export function useSeriesDetail(id: number): UseQueryResult<UseSeriesDetailResponse> {
    const client = useApiClient();
    return useQuery({
      queryKey: ['series-detail', id],
      queryFn: async () => {
        const res = await client.fetch(`/api/sermons/series/${id}`);
        if (!res.ok) throw new Error(`Series detail request failed: ${res.status}`);
        return (await res.json()) as UseSeriesDetailResponse;
      },
      enabled: Number.isFinite(id) && id > 0,
    });
  }
  ```

  Re-run: PASS.

### Tasks 3.2–3.6: Remaining hooks

Each follows the exact same pattern as Task 3.1 — copy legacy test, adjust imports, create thin React Query hook.

- [ ] **Task 3.2 / `useSpeakers`** — Endpoint `/api/sermons/speakers`. No query params. Operation: `listSpeakers`.
- [ ] **Task 3.3 / `useBooks`** — Endpoint `/api/sermons/books`. Operation: `listBooks`.
- [ ] **Task 3.4 / `useServiceTypes`** — Endpoint `/api/sermons/service-types`. Operation: `listServiceTypes`.
- [ ] **Task 3.5 / `useSeriesTypes`** — Endpoint `/api/sermons/series-types`. Operation: `listSeriesTypes`.

**Note: `useSermonFacets` is NOT in `@perimeter/api-hooks`.** Inspection of `legacy/v1:widgets/sermons/src/hooks/use-sermon-facets.ts` confirms it's a composite hook that internally calls `useSpeakers`, `useBooks`, `useServiceTypes`, `useSeriesTypes`, and possibly `useSeries` to build a derived facets object — it does not correspond to a single OpenAPI operation. It is therefore a widget-internal concern, not a thin endpoint wrapper. **Port it in Chunk 5 alongside the other widget-internal hooks** (`use-sermon-filters`, `use-media-player`, `use-filter-label-cache`). Relocate the legacy hook test to `widgets/sermons/tests/hooks/use-sermon-facets.test.tsx` accordingly.

For each (Tasks 3.2-3.5):

- [ ] Write the test fresh using the Chunk 2 wrap-helper scaffold. Cover URL + JSON return + error + query key.
- [ ] Confirm FAIL.
- [ ] Create `packages/api-hooks/src/sermons/<name>.ts` following the same skeleton as `useSermons` (with `serializeQuery` if there are params) or `useSermonDetail` (path-only).
- [ ] Confirm PASS.

### Task 3.7: Update package index + quality + commit

- [ ] **Step 3.7.1:** Update `packages/api-hooks/src/index.ts` to re-export the six new hooks:

  ```ts
  export { useSermons, type UseSermonsParams, type UseSermonsResponse } from './sermons/use-sermons';
  export { useSermonDetail, type UseSermonDetailResponse } from './sermons/use-sermon-detail';
  export { useSeries, type UseSeriesParams, type UseSeriesResponse } from './sermons/use-series';
  export { useSeriesDetail, type UseSeriesDetailResponse } from './sermons/use-series-detail';
  export { useSpeakers, type UseSpeakersResponse } from './sermons/use-speakers';
  export { useBooks, type UseBooksResponse } from './sermons/use-books';
  export { useServiceTypes, type UseServiceTypesResponse } from './sermons/use-service-types';
  export { useSeriesTypes, type UseSeriesTypesResponse } from './sermons/use-series-types';
  ```

  (Eight sermons-endpoint hooks. `useSermonFacets` is widget-internal — ported in Chunk 5.)

- [ ] **Step 3.7.2:** Quality:

  Run: `pnpm --filter @perimeter/api-hooks lint && pnpm --filter @perimeter/api-hooks typecheck && pnpm --filter @perimeter/api-hooks test`
  Expected: exits 0. All nine hook test files + 1 serialize-query test should pass.

- [ ] **Step 3.7.3:** Repo-wide: `pnpm quality`. Expected: exits 0.

- [ ] **Step 3.7.4:** Commit. Write `/tmp/commit-phase2-3.txt`:

  ```
  feat(api-hooks): add remaining six sermons hooks

  useSeriesDetail, useSpeakers, useBooks, useServiceTypes,
  useSeriesTypes, useSermonFacets. All nine sermons-endpoint hooks
  are now in @perimeter/api-hooks with typed params/responses derived
  from @perimeter/api-types and tests relocated from the legacy
  widget.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

  Then: `git add packages/api-hooks && git commit -F /tmp/commit-phase2-3.txt && rm /tmp/commit-phase2-3.txt`.

### Chunk 3 acceptance

- All nine sermons hooks exist with passing tests.
- `pnpm quality` exits 0.

---

## Chunk 4: `widgets/sermons` scaffold + types + lib utilities

**Outcome:** `widgets/sermons` package exists with its config schema (`types.ts`), the three lib utilities ported as-is, and their tests passing.

### Task 4.1: Scaffold the package

**Files:**
- Create: `widgets/sermons/package.json`
- Create: `widgets/sermons/tsconfig.json`
- Create: `widgets/sermons/vite.config.ts`
- Create: `widgets/sermons/vitest.config.ts`
- Create: `widgets/sermons/tailwind.config.ts`
- Create: `widgets/sermons/postcss.config.js`
- Create: `widgets/sermons/src/styles.css`
- Create: `widgets/sermons/tests/setup.ts`

- [ ] **Step 4.1.1:** Create `widgets/sermons/package.json`:

  ```json
  {
    "name": "@perimeter/widget-sermons",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "scripts": {
      "dev": "vite build --watch",
      "build": "vite build",
      "lint": "eslint src tests",
      "typecheck": "tsc --noEmit",
      "test": "vitest run"
    },
    "dependencies": {
      "@headlessui/react": "^2.2.9",
      "@perimeter/api-hooks": "workspace:*",
      "@perimeter/api-types": "workspace:*",
      "@perimeter/theme": "workspace:*",
      "@perimeter/ui": "workspace:*",
      "@perimeter/widget-runtime": "workspace:*",
      "@tanstack/react-query": "^5.62.7",
      "framer-motion": "^12.0.0",
      "hls.js": "^1.6.0",
      "lucide-react": "^0.577.0",
      "luxon": "^3.7.0",
      "nuqs": "^2.8.0",
      "react": "^19.0.0",
      "react-dom": "^19.0.0",
      "react-pdf": "^10.0.0",
      "zod": "^3.24.1"
    },
    "devDependencies": {
      "@perimeter/vite-plugin-widget": "workspace:*",
      "@testing-library/jest-dom": "^6.6.3",
      "@testing-library/react": "^16.1.0",
      "@testing-library/user-event": "^14.6.0",
      "@types/luxon": "^3.7.0",
      "@types/react": "^19.0.7",
      "@types/react-dom": "^19.0.3",
      "@vitest/coverage-v8": "^2.1.8",
      "autoprefixer": "^10.4.20",
      "jsdom": "^25.0.1",
      "postcss": "^8.5.1",
      "tailwindcss": "^3.4.17",
      "typescript": "^5.7.3",
      "vite": "^6.0.7",
      "vitest": "^2.1.8"
    }
  }
  ```

- [ ] **Step 4.1.2:** Create `widgets/sermons/tsconfig.json`:

  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": { "rootDir": ".", "noEmit": true },
    "include": ["src/**/*", "tests/**/*"]
  }
  ```

- [ ] **Step 4.1.3:** Create `widgets/sermons/vite.config.ts`:

  ```ts
  import { defineConfig } from 'vite';
  import { perimeterWidget } from '@perimeter/vite-plugin-widget';

  export default defineConfig({
    plugins: [perimeterWidget({ name: 'sermons', entry: 'src/index.tsx' })],
    build: { outDir: '../../dist/sermons' },
  });
  ```

- [ ] **Step 4.1.4:** Create `widgets/sermons/vitest.config.ts`:

  ```ts
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.{ts,tsx}'],
      setupFiles: ['./tests/setup.ts'],
      poolOptions: {
        threads: { execArgv: ['--no-experimental-webstorage'] },
        forks:   { execArgv: ['--no-experimental-webstorage'] },
      },
    },
  });
  ```

- [ ] **Step 4.1.5:** Create `widgets/sermons/tailwind.config.ts`:

  ```ts
  import type { Config } from 'tailwindcss';
  import preset from '@perimeter/theme/tailwind';

  const config: Config = {
    presets: [preset],
    content: ['./src/**/*.{ts,tsx}'],
  };
  export default config;
  ```

- [ ] **Step 4.1.6:** Create `widgets/sermons/postcss.config.js`:

  ```js
  export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
  ```

- [ ] **Step 4.1.7:** Create `widgets/sermons/src/styles.css`:

  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```

- [ ] **Step 4.1.8:** Create `widgets/sermons/tests/setup.ts`:

  ```ts
  import '@testing-library/jest-dom/vitest';
  import { afterEach } from 'vitest';
  import { cleanup } from '@testing-library/react';
  afterEach(() => { cleanup(); });
  ```

- [ ] **Step 4.1.9:** Install: `pnpm install`.

### Task 4.2: Port `src/types.ts`

**Files:**
- Create: `widgets/sermons/src/types.ts`

- [ ] **Step 4.2.1:** Copy the legacy types file:

  ```bash
  git show legacy/v1:widgets/sermons/src/types.ts > widgets/sermons/src/types.ts
  ```

- [ ] **Step 4.2.2:** Adjust the import path:

  Open `widgets/sermons/src/types.ts`. Change `from '@perimeter-widgets/shared'` to `from '@perimeter/api-types'`. The rest of the file should compile unchanged.

  **`exactOptionalPropertyTypes` likely-impact:** the legacy `SermonsConfigSchema` uses ~16 `z.coerce.<type>().optional()` fields (perPage, defaultTab, defaultView, apiUrl, tab, display, seriesId, speakerId, bookId, serviceTypeId, seriesTypeId, hide*, show*, from, to). When consumers spread the inferred type into another object, TS may reject the spread because optional-but-not-explicitly-undefined fields conflict with the destination's `?: T | undefined` typings. The most common fix is to explicitly add `| undefined` to the **destination** type rather than to the zod schema's inferred type. Patch fields only where TS actually fails — don't pre-emptively widen everything.

- [ ] **Step 4.2.3:** Quick smoke:

  Run: `pnpm --filter @perimeter/widget-sermons typecheck`
  Expected: exits 0 (no other files yet to typecheck against).

### Task 4.3: Port `src/lib/` utilities

**Files:**
- Create: `widgets/sermons/src/lib/format.ts`
- Create: `widgets/sermons/src/lib/pagination.ts`
- Create: `widgets/sermons/src/lib/bible-books.ts`

- [ ] **Step 4.3.1:** Copy all three lib files:

  ```bash
  mkdir -p widgets/sermons/src/lib
  for f in format pagination bible-books; do
    git show legacy/v1:widgets/sermons/src/lib/${f}.ts > widgets/sermons/src/lib/${f}.ts
  done
  ```

- [ ] **Step 4.3.2:** Inspect each for imports from `@perimeter-widgets/shared`; replace with `@perimeter/api-types` or the appropriate new package. If a file references `luxon`, it works unchanged.

- [ ] **Step 4.3.3:** Run typecheck. Expected: exits 0.

### Task 4.4: Port lib + types tests

**Files:**
- Create: `widgets/sermons/tests/types.test.ts`
- Create: `widgets/sermons/tests/lib/format.test.ts`
- Create: `widgets/sermons/tests/lib/pagination.test.ts`

- [ ] **Step 4.4.1:** Copy the legacy tests:

  ```bash
  mkdir -p widgets/sermons/tests/lib
  git show legacy/v1:widgets/sermons/src/__tests__/types.test.ts \
    > widgets/sermons/tests/types.test.ts
  git show legacy/v1:widgets/sermons/src/__tests__/lib/format.test.ts \
    > widgets/sermons/tests/lib/format.test.ts
  git show legacy/v1:widgets/sermons/src/__tests__/lib/pagination.test.ts \
    > widgets/sermons/tests/lib/pagination.test.ts
  ```

- [ ] **Step 4.4.2:** Adjust import paths in each test:

  - `from '../types'` → `from '../../src/types'`
  - `from '../lib/format'` → `from '../../src/lib/format'`
  - `from '../lib/pagination'` → `from '../../src/lib/pagination'`
  - Any `from '@perimeter-widgets/shared'` → `from '@perimeter/api-types'`

- [ ] **Step 4.4.3:** Run tests:

  Run: `pnpm --filter @perimeter/widget-sermons test`
  Expected: PASS. Three test files, N assertions across.

### Task 4.5: Quality + commit

- [ ] **Step 4.5.1:** Run package quality:

  Run: `pnpm --filter @perimeter/widget-sermons lint && pnpm --filter @perimeter/widget-sermons typecheck && pnpm --filter @perimeter/widget-sermons test`
  Expected: exits 0.

- [ ] **Step 4.5.2:** Repo-wide: `pnpm quality`. Expected: exits 0.

- [ ] **Step 4.5.3:** Commit. Write `/tmp/commit-phase2-4.txt`:

  ```
  feat(widget-sermons): scaffold package, port types and lib utilities

  Package scaffold with Tailwind via @perimeter/theme/tailwind preset.
  Ports types.ts (config schema + zod), lib/format.ts, lib/pagination.ts,
  and lib/bible-books.ts from legacy/v1 with minimal adjustments
  (shared imports → @perimeter/api-types). Tests for types + format +
  pagination ported and pass.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

  Then: `git add widgets/sermons pnpm-lock.yaml && git commit -F /tmp/commit-phase2-4.txt && rm /tmp/commit-phase2-4.txt`.

### Chunk 4 acceptance

- `widgets/sermons/` package exists with config types + lib + 3 passing test files.
- `pnpm quality` exits 0.

---

## Chunk 5: `widgets/sermons` widget-internal hooks

**Outcome:** Three widget-internal hooks ported: `use-sermon-filters` (URL state via nuqs + config-pinned filters), `use-media-player`, `use-filter-label-cache`. Their tests pass.

### Task 5.1: Port `use-sermon-filters`

**Files:**
- Create: `widgets/sermons/src/hooks/use-sermon-filters.ts`
- Create: `widgets/sermons/tests/hooks/use-sermon-filters.test.tsx`

- [ ] **Step 5.1.1:** Copy hook + test from legacy:

  ```bash
  mkdir -p widgets/sermons/src/hooks widgets/sermons/tests/hooks
  git show legacy/v1:widgets/sermons/src/hooks/use-sermon-filters.ts \
    > widgets/sermons/src/hooks/use-sermon-filters.ts
  git show legacy/v1:widgets/sermons/src/__tests__/use-sermon-filters.test.tsx \
    > widgets/sermons/tests/hooks/use-sermon-filters.test.tsx
  ```

- [ ] **Step 5.1.2:** Adjust imports in both files:
  - Test: `from '../../src/hooks/use-sermon-filters'` instead of relative legacy paths.
  - Hook: any `@perimeter-widgets/shared` → `@perimeter/api-types` or remove if it was for `useConfig` (this hook takes `config` as a parameter, so it shouldn't need `useConfig`). Inspect.

- [ ] **Step 5.1.3:** Run test:

  Run: `pnpm --filter @perimeter/widget-sermons test -- hooks/use-sermon-filters`
  Expected: PASS. If it fails on `nuqs`, the hook likely needs to be tested inside a `<NuqsTestingAdapter>` (`from 'nuqs/adapters/testing'`) — check the legacy test for that pattern.

### Task 5.2: Port `use-media-player`

**Files:**
- Create: `widgets/sermons/src/hooks/use-media-player.ts`

- [ ] **Step 5.2.1:** Copy:

  ```bash
  git show legacy/v1:widgets/sermons/src/hooks/use-media-player.ts \
    > widgets/sermons/src/hooks/use-media-player.ts
  ```

  No legacy test for this hook in `__tests__/hooks/`. Skip test port.

- [ ] **Step 5.2.2:** Adjust imports if any.

### Task 5.3: Port `use-filter-label-cache`

**Files:**
- Create: `widgets/sermons/src/hooks/use-filter-label-cache.ts`
- Create: `widgets/sermons/tests/hooks/use-filter-label-cache.test.tsx`

- [ ] **Step 5.3.1:** Copy hook + test:

  ```bash
  git show legacy/v1:widgets/sermons/src/hooks/use-filter-label-cache.ts \
    > widgets/sermons/src/hooks/use-filter-label-cache.ts
  git show legacy/v1:widgets/sermons/src/__tests__/hooks/use-filter-label-cache.test.tsx \
    > widgets/sermons/tests/hooks/use-filter-label-cache.test.tsx
  ```

- [ ] **Step 5.3.2:** Adjust imports.

- [ ] **Step 5.3.3:** Run test. Expected: PASS.

### Task 5.4: Port `use-sermon-facets` (the widget-internal composite)

**Files:**
- Create: `widgets/sermons/src/hooks/use-sermon-facets.ts`
- Create: `widgets/sermons/tests/hooks/use-sermon-facets.test.tsx`

- [ ] **Step 5.4.1:** Copy hook + test from legacy:

  ```bash
  git show legacy/v1:widgets/sermons/src/hooks/use-sermon-facets.ts \
    > widgets/sermons/src/hooks/use-sermon-facets.ts
  git show legacy/v1:widgets/sermons/src/__tests__/hooks/use-sermon-facets.test.tsx \
    > widgets/sermons/tests/hooks/use-sermon-facets.test.tsx
  ```

- [ ] **Step 5.4.2:** Adjust imports:
  - Internal hook imports (`use-speakers`, `use-books`, etc.) → `from '@perimeter/api-hooks'`.
  - Type imports → `from '@perimeter/api-types'` or local `src/types`.
  - Refactor the legacy `config` argument shape if needed (the composite takes a `config: SermonsConfig` — keep it that way; this is widget-internal, not an api-hook).

- [ ] **Step 5.4.3:** Adjust the test: pass the upstream hook results via test doubles (e.g. `vi.mock('@perimeter/api-hooks', () => ({ useSpeakers: () => ({ data: [...], isLoading: false }), ... }))`).

- [ ] **Step 5.4.4:** Run test. Expected: PASS.

### Task 5.5: Quality + commit

- [ ] **Step 5.5.1:** Run package quality + repo-wide.

- [ ] **Step 5.5.2:** Commit. Write `/tmp/commit-phase2-5.txt`:

  ```
  feat(widget-sermons): port widget-internal hooks

  Ports use-sermon-filters (nuqs-backed URL state + config-pinned
  filters), use-media-player, use-filter-label-cache, and the
  use-sermon-facets composite from legacy/v1. Facets is a widget-
  internal composite over multiple api-hooks (not a single API
  endpoint) — kept inside the widget package. Tests for filters,
  label cache, and facets ported and pass.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

  Then: `git add widgets/sermons && git commit -F /tmp/commit-phase2-5.txt && rm /tmp/commit-phase2-5.txt`.

### Chunk 5 acceptance

- Four widget-internal hooks ported with tests passing (filters, media-player, label-cache, facets).
- `pnpm quality` exits 0.

---

## Chunk 6a: Expand `@perimeter/ui` with the components sermons depends on (ADDED MID-EXECUTION)

**Why this exists:** Chunk 6 execution surfaced a planning gap. The legacy sermons widget consumes ~13 richer UI components + 2 hooks from the legacy shadcn registry (`legacy/v1:packages/registry/ui/perimeter/` and `legacy/v1:packages/shared/`) via `@perimeter-widgets/shared`. The rebuilt `@perimeter/ui` deliberately ships only 5 hand-written primitives (Button, Card, Input, Label, Skeleton). The Phase 2 spec's "faithful 1:1 port" never reconciled this. **Decision (user, 2026-05-27): expand `@perimeter/ui` with the needed components as shared, hand-owned code** — the long-term-correct home; future widgets reuse them. This adds `@base-ui/react`, `class-variance-authority`, and `downshift` as `@perimeter/ui` dependencies.

**Outcome:** `@perimeter/ui` exports the components + hooks below, each in its own file, each added to `package.json#exports`, each with at least a smoke render test. `pnpm --filter @perimeter/ui lint && typecheck && test` exit 0.

### Components to port (from `legacy/v1`)

From `legacy/v1:packages/registry/ui/perimeter/`:
- `tabs.tsx` → `Tabs`, `TabsList`, `TabsTrigger` (+ panel if present). Uses `@base-ui/react/tabs`.
- `combobox.tsx` → `Combobox`. Uses `downshift`.
- `multi-combobox.tsx` → `MultiCombobox`, `MultiComboboxOption`. Uses `downshift`.
- `input-group.tsx` → `InputGroup`, `InputGroupAddon`, `InputGroupInput`.
- `pagination.tsx` → `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationNext`, `PaginationPrevious`, `PaginationEllipsis`.
- `badge.tsx` → `Badge`.
- `empty.tsx` → `Empty`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription`.
- `spinner.tsx` → `Spinner`.
- `textarea.tsx` → `Textarea` (input-group depends on it — port if referenced).

From `legacy/v1:packages/shared/src/components/ui/perimeter/`:
- `sort-select.tsx` → `SortSelect`. Uses `useClickOutside`.
- `icon-select.tsx` → `IconSelect`. Uses `useClickOutside`.

From `legacy/v1:packages/shared/src/components/motion/`:
- `SkeletonTransition.tsx` → `SkeletonTransition`. Uses `framer-motion` + a small `motion/config`. Port the `config` too (`legacy/v1:packages/shared/src/lib/motion/config.ts`).

Hooks (from `legacy/v1:packages/shared/src/lib/`):
- `use-click-outside.ts` → `useClickOutside`.
- `use-safe-html.ts` → `useSafeHtml` (needed by SermonDetail in Chunk 7).

### Dependencies to add to `@perimeter/ui/package.json`

```
"@base-ui/react": "^1.3.0",
"class-variance-authority": "^0.7.1",
"downshift": "^9.3.2",
"framer-motion": "^12.0.0"
```
(`clsx`, `tailwind-merge`, `lucide-react`, `react` are already there or added as needed. Note legacy used `lucide-react ^0.577.0` in shared — match the version already in @perimeter/ui to avoid a second copy.)

### Import-alias translation rules

Legacy registry components use path aliases that don't exist in `@perimeter/ui`:
- `@/lib/utils` (their `cn`) → `./utils/cn` (the `cn` already in `@perimeter/ui`).
- `@/components/ui/button` → `./button` (the existing `@perimeter/ui` Button). **Check API compatibility** — the registry `Button` has `cva` variants; the existing `@perimeter/ui` Button has `variant: primary|secondary|ghost` + `size`. If a ported component (e.g. pagination) needs a registry-Button variant the new Button lacks, either (a) extend the new Button's variants, or (b) use the new Button's nearest equivalent. Note the divergence in your report.
- `@/components/ui/input` → `./input`; `@/components/ui/textarea` → `./textarea` (port textarea if needed).
- `'use client'` directives: harmless in the IIFE build; keep or drop consistently (the existing @perimeter/ui components don't use them — drop for consistency).

### Tasks

- [ ] **6a.1:** Add the four deps to `@perimeter/ui/package.json`; `pnpm install`.
- [ ] **6a.2:** Port `use-click-outside.ts` + `use-safe-html.ts` into `@perimeter/ui/src/hooks/` (or `src/lib/`); export via subpath. Port their legacy tests if present.
- [ ] **6a.3:** Port the registry components one at a time, each into its own `@perimeter/ui/src/<name>.tsx`, translating import aliases. Add each to `package.json#exports` (subpath like `./tabs`, `./multi-combobox`, `./pagination`, etc.). Write a smoke render test per component (renders without throwing; key roles/text present).
- [ ] **6a.4:** Port `SortSelect`, `IconSelect`, `SkeletonTransition` (+ motion config). Subpath exports.
- [ ] **6a.5:** `pnpm --filter @perimeter/ui lint && typecheck && test` → exit 0. Do NOT run repo-wide `pnpm quality` yet (the sermons package is mid-port and red until Chunk 6 resumes).
- [ ] **6a.6:** Commit `packages/ui` + `pnpm-lock.yaml`. Message:

  ```
  feat(ui): expand @perimeter/ui with sermons-required components

  Ports Tabs, Combobox, MultiCombobox, InputGroup, Pagination, Badge,
  Empty, Spinner, Textarea, SortSelect, IconSelect, SkeletonTransition
  + useClickOutside/useSafeHtml from the legacy shadcn registry. Adds
  @base-ui/react, class-variance-authority, downshift, framer-motion as
  @perimeter/ui deps. Each component is its own file + subpath export
  with a smoke test. Decided mid-Phase-2 (component layer the sermons
  port depends on; the slimmed Phase 1 @perimeter/ui shipped only 5
  primitives).

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

### Chunk 6a acceptance

- `@perimeter/ui` exports all the components + 2 hooks above, each tested.
- `pnpm --filter @perimeter/ui lint && typecheck && test` exit 0.
- The bundle-size implication (these add to the eventual sermons IIFE) is tracked by the Chunk 8 bundle test against the 500 KB budget.

---

## Chunk 6: UI primitives + non-detail components

> **Resumes after Chunk 6a.** When porting SermonTabs/SeriesView/SermonGrid/etc., repoint the legacy `@perimeter-widgets/shared` value imports (Tabs, MultiCombobox, InputGroup, Pagination, Badge, Empty, Spinner, SortSelect, IconSelect, SkeletonTransition) to their new `@perimeter/ui/<name>` subpaths. The 9 widget files ported during the first Chunk 6 attempt are uncommitted on disk and finalized here once their sibling components (SermonTabs, SeriesView) resolve.

**Outcome:** All UI primitives (`DatePicker`, `DateRangePicker`, `ImagePlaceholder`, `MediaCard`, `Modal`) and the non-detail components (`SermonTabs`, sermons/`SermonGrid`/`SermonLargeList`/`SermonSmallList`, series/`SeriesGrid`/`SeriesView`) ported. `SermonGrid.test.tsx` passes.

### Task 6.1: Port UI primitives

**Files (all under `widgets/sermons/src/components/ui/`):**

- [ ] **Step 6.1.1:** Copy all 5 files:

  ```bash
  mkdir -p widgets/sermons/src/components/ui
  for f in DatePicker DateRangePicker ImagePlaceholder MediaCard Modal; do
    git show legacy/v1:widgets/sermons/src/components/ui/${f}.tsx \
      > widgets/sermons/src/components/ui/${f}.tsx
  done
  ```

- [ ] **Step 6.1.2:** For each file, inspect imports and adjust:
  - `from '@perimeter-widgets/shared'` → `from '@perimeter/api-types'` (or remove if for `useConfig`).
  - `from '@headlessui/react'` stays.
  - `from 'lucide-react'` stays.
  - Components reading `config` via `useConfig()` are refactored to accept it as a prop. Add `config: SermonsConfig` to the component's props interface and thread it through. If a UI primitive doesn't actually use `config`, just remove the import.

  This is the recurring port-time refactor. Each component file should:
  1. Replace `const config = useConfig<SermonsConfig>()` with reading it from props.
  2. Have `config: SermonsConfig` added to its props interface.

  **Bounded scope:** grep against `legacy/v1` shows exactly five widget source files call `useConfig`:
  - `widgets/sermons/src/App.tsx` (refactored in Chunk 8)
  - `widgets/sermons/src/components/series/SeriesGrid.tsx` (this chunk)
  - `widgets/sermons/src/components/sermons/SermonGrid.tsx` (this chunk)
  - `widgets/sermons/src/components/sermons/SermonLargeList.tsx` (this chunk)
  - `widgets/sermons/src/components/sermons/SermonSmallList.tsx` (this chunk)

  Plus one test: `widgets/sermons/src/__tests__/components/SermonGrid.test.tsx` (handled in Task 6.3.3). That's the entire refactor surface — no other file uses the hook.

### Task 6.2: Port `SermonTabs.tsx`

- [ ] **Step 6.2.1:** Copy:

  ```bash
  git show legacy/v1:widgets/sermons/src/components/SermonTabs.tsx \
    > widgets/sermons/src/components/SermonTabs.tsx
  ```

- [ ] **Step 6.2.2:** Adjust per Task 6.1.2.

### Task 6.3: Port sermons grid + list components

**Files:**
- Create: `widgets/sermons/src/components/sermons/SermonGrid.tsx`
- Create: `widgets/sermons/src/components/sermons/SermonLargeList.tsx`
- Create: `widgets/sermons/src/components/sermons/SermonSmallList.tsx`
- Create: `widgets/sermons/tests/components/SermonGrid.test.tsx`

- [ ] **Step 6.3.1:** Copy:

  ```bash
  mkdir -p widgets/sermons/src/components/sermons widgets/sermons/tests/components
  for f in SermonGrid SermonLargeList SermonSmallList; do
    git show legacy/v1:widgets/sermons/src/components/sermons/${f}.tsx \
      > widgets/sermons/src/components/sermons/${f}.tsx
  done
  git show legacy/v1:widgets/sermons/src/__tests__/components/SermonGrid.test.tsx \
    > widgets/sermons/tests/components/SermonGrid.test.tsx
  ```

- [ ] **Step 6.3.2:** Adjust source imports per Task 6.1.2.

- [ ] **Step 6.3.3:** Adjust test imports:
  - Component import: `from '../../src/components/sermons/SermonGrid'`.
  - Type imports redirect to `@perimeter/api-types` or `widgets/sermons/src/types`.
  - If the test renders the component and was relying on a `useConfig` provider, refactor to pass `config` as a prop instead. (This is the largest test adjustment in this chunk.)

- [ ] **Step 6.3.4:** Run test:

  Run: `pnpm --filter @perimeter/widget-sermons test -- components/SermonGrid`
  Expected: PASS.

### Task 6.4: Port series grid + view

**Files:**
- Create: `widgets/sermons/src/components/series/SeriesGrid.tsx`
- Create: `widgets/sermons/src/components/series/SeriesView.tsx`

- [ ] **Step 6.4.1:** Copy:

  ```bash
  mkdir -p widgets/sermons/src/components/series
  for f in SeriesGrid SeriesView; do
    git show legacy/v1:widgets/sermons/src/components/series/${f}.tsx \
      > widgets/sermons/src/components/series/${f}.tsx
  done
  ```

- [ ] **Step 6.4.2:** Adjust imports + refactor `useConfig` → prop per Task 6.1.2. Replace legacy hook imports with `@perimeter/api-hooks`:
  - `import { useSeries } from '../../hooks/use-series'` → `import { useSeries } from '@perimeter/api-hooks'`.

### Task 6.5: Quality + commit

- [ ] **Step 6.5.1:** Run package + repo quality.

- [ ] **Step 6.5.2:** Commit. Write `/tmp/commit-phase2-6.txt`:

  ```
  feat(widget-sermons): port UI primitives and non-detail components

  Ports the 5 UI primitives (DatePicker, DateRangePicker,
  ImagePlaceholder, MediaCard, Modal), SermonTabs, the three sermons
  list components (Grid, LargeList, SmallList), and the series Grid
  and View. Components refactored to receive config as a prop
  (legacy's useConfig() hook is not reproduced).

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

  Then: `git add widgets/sermons && git commit -F /tmp/commit-phase2-6.txt && rm /tmp/commit-phase2-6.txt`.

### Chunk 6 acceptance

- 11 components ported.
- `SermonGrid.test.tsx` passes.
- `pnpm quality` exits 0.

---

## Chunk 7: Filters, detail views, and media players

**Outcome:** Filters, sermon + series detail views, and the four media-player components ported. `SermonFilters.test.tsx` and `PdfViewer.test.tsx` pass.

### Task 7.1: Port sermons filter + view + detail + info

**Files:**
- Create: `widgets/sermons/src/components/sermons/SermonFilters.tsx`
- Create: `widgets/sermons/src/components/sermons/SermonsView.tsx`
- Create: `widgets/sermons/src/components/sermons/SermonDetail.tsx`
- Create: `widgets/sermons/src/components/sermons/SermonInfo.tsx`
- Create: `widgets/sermons/tests/components/SermonFilters.test.tsx`

- [ ] **Step 7.1.1:** Copy all four sources + the test:

  ```bash
  for f in SermonFilters SermonsView SermonDetail SermonInfo; do
    git show legacy/v1:widgets/sermons/src/components/sermons/${f}.tsx \
      > widgets/sermons/src/components/sermons/${f}.tsx
  done
  git show legacy/v1:widgets/sermons/src/__tests__/components/SermonFilters.test.tsx \
    > widgets/sermons/tests/components/SermonFilters.test.tsx
  ```

- [ ] **Step 7.1.2:** Adjust imports per Task 6.1.2 (especially: `useConfig` → prop; `useSermons`/`useSermonDetail`/`useSermonFacets`/`useSpeakers`/etc. → import from `@perimeter/api-hooks`).

- [ ] **Step 7.1.3:** Test adjustments: similar to SermonGrid test — pass `config` as prop; mock `@perimeter/api-hooks` hooks where needed via `vi.mock('@perimeter/api-hooks', ...)`.

- [ ] **Step 7.1.4:** Run test. Expected: PASS.

### Task 7.2: Port series detail

**Files:**
- Create: `widgets/sermons/src/components/series/SeriesDetail.tsx`

- [ ] **Step 7.2.1:** Copy:

  ```bash
  git show legacy/v1:widgets/sermons/src/components/series/SeriesDetail.tsx \
    > widgets/sermons/src/components/series/SeriesDetail.tsx
  ```

- [ ] **Step 7.2.2:** Adjust imports + refactor `useConfig` → prop. Hook imports for `useSeriesDetail`, etc., come from `@perimeter/api-hooks`.

### Task 7.3: Port media players

**Files:**
- Create: `widgets/sermons/src/components/players/AudioPlayer.tsx`
- Create: `widgets/sermons/src/components/players/VideoPlayer.tsx`
- Create: `widgets/sermons/src/components/players/PdfViewer.tsx`
- Create: `widgets/sermons/src/components/players/MediaTabs.tsx`
- Create: `widgets/sermons/tests/components/players/PdfViewer.test.tsx`

- [ ] **Step 7.3.1:** Copy:

  ```bash
  mkdir -p widgets/sermons/src/components/players widgets/sermons/tests/components/players
  for f in AudioPlayer VideoPlayer PdfViewer MediaTabs; do
    git show legacy/v1:widgets/sermons/src/components/players/${f}.tsx \
      > widgets/sermons/src/components/players/${f}.tsx
  done
  git show legacy/v1:widgets/sermons/src/__tests__/components/PdfViewer.test.tsx \
    > widgets/sermons/tests/components/players/PdfViewer.test.tsx
  ```

- [ ] **Step 7.3.2:** Adjust imports. `hls.js`, `react-pdf`, etc., stay.

- [ ] **Step 7.3.3:** **react-pdf worker setup.** `react-pdf` requires a worker URL. Open the legacy `PdfViewer.tsx` and copy whatever it configures for `pdfjs.GlobalWorkerOptions.workerSrc` verbatim:
  - If legacy uses `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()`, Vite inlines the worker at build — keep it.
  - If legacy uses a CDN URL (e.g. `unpkg.com/pdfjs-dist@.../build/pdf.worker.min.js`), keep that — the worker is fetched at runtime, doesn't affect bundle size.

  The trigger for changing the worker setup is **runtime PDF rendering failure during the Studio smoke pass (Chunk 9)**, not the bundle-size test. A CDN-fetched worker doesn't appear in the IIFE bytes; a bundled worker does.

- [ ] **Step 7.3.4:** Adjust the PdfViewer test similarly: imports, mock `react-pdf` as needed.

- [ ] **Step 7.3.5:** Run test. Expected: PASS.

### Task 7.4: Quality + commit

- [ ] **Step 7.4.1:** Run quality.

- [ ] **Step 7.4.2:** Commit. Write `/tmp/commit-phase2-7.txt`:

  ```
  feat(widget-sermons): port filters, detail views, and media players

  Ports SermonFilters, SermonsView, SermonDetail, SermonInfo from
  legacy sermons; SeriesDetail from legacy series; and AudioPlayer,
  VideoPlayer (HLS.js), PdfViewer (react-pdf), MediaTabs from legacy
  players. Tests for SermonFilters and PdfViewer pass.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

  Then: `git add widgets/sermons && git commit -F /tmp/commit-phase2-7.txt && rm /tmp/commit-phase2-7.txt`.

### Chunk 7 acceptance

- All filter, detail, and media-player components ported.
- `SermonFilters.test.tsx` + `PdfViewer.test.tsx` pass.
- `pnpm quality` exits 0.

---

## Chunk 8: App, entry, integration test, bundle test

**Outcome:** `App.tsx` and `index.tsx` are in place; the sermons widget mounts via `defineWidget`. `App.test.tsx` passes. Bundle builds at `dist/sermons/sermons.iife.js` under 500 KB gzipped.

### Task 8.1: Port `App.tsx` with config drilling

**Files:**
- Create: `widgets/sermons/src/App.tsx`

- [ ] **Step 8.1.1:** Copy the legacy App:

  ```bash
  git show legacy/v1:widgets/sermons/src/App.tsx > widgets/sermons/src/App.tsx
  ```

- [ ] **Step 8.1.2:** Apply the following refactor:

  1. **Remove `useConfig` import and call.** The legacy `SermonsWidget` reads `useConfig<SermonsConfig>()`. The new platform passes `config` as a prop to `App`. Refactor:

     ```tsx
     // Before (legacy)
     function SermonsWidget() {
       const rawConfig = useConfig<SermonsConfig>();
       const config = applyWidgetDefaults(rawConfig);
       ...
     }
     export function SermonsApp() {
       return (<NuqsAdapter><SermonsWidget /></NuqsAdapter>);
     }

     // After (new platform — file exports `App` for defineWidget)
     export interface AppProps {
       config: SermonsConfig;
     }
     export function App({ config: rawConfig }: AppProps): React.JSX.Element {
       const config = applyWidgetDefaults(rawConfig);
       const targetId = useStableTargetId(); // see step 8.1.3
       return (
         <NuqsAdapter urlKeys={{ prefix: `${targetId}.` }}>
           <SermonsWidget config={config} />
         </NuqsAdapter>
       );
     }

     function SermonsWidget({ config }: { config: SermonsConfig }) {
       const filters = useSermonFilters(config);
       // ...legacy body, threading `config` into <SermonsView>, <SeriesView>,
       // <SermonDetail>, <SeriesDetail>, etc.
     }
     ```

  2. **Thread `config` as a prop into every child component** that the legacy code passed `config` through. The new platform doesn't have `useConfig`; each child receives `config` from its parent. Most child components already accept `config` (legacy passed it through props mostly); only `useConfig` consumers need updating — verify by grepping the file.

- [ ] **Step 8.1.3:** Add `useStableTargetId` — generates a unique-per-App-instance id once and returns it. Used as nuqs's URL-state prefix so multiple sermons embeds on the same page don't collide.

  ```ts
  function useStableTargetId(): string {
    const idRef = React.useRef<string | null>(null);
    if (idRef.current === null) {
      idRef.current = `perimeter-sermons-${crypto.randomUUID()}`;
    }
    return idRef.current;
  }
  ```

  Note: this fallback does NOT write the id back to the host `<div>`. That means shareable URLs change between page loads (each load generates a new prefix), which is a regression from a hypothetical "stable id on the host div" design. The multi-embed collision risk is fully fixed regardless. If a future phase wants stable URLs, the implementer can revisit by reading the host element through `target.id` inside `mountWidget` and threading it down as a prop on the `App` — out of scope for Phase 2.

- [ ] **Step 8.1.4:** Quick typecheck. Run: `pnpm --filter @perimeter/widget-sermons typecheck`. Expected: exits 0.

### Task 8.2: Port `App.test.tsx`

**Files:**
- Create: `widgets/sermons/tests/App.test.tsx`

- [ ] **Step 8.2.1:** Copy:

  ```bash
  git show legacy/v1:widgets/sermons/src/__tests__/App.test.tsx \
    > widgets/sermons/tests/App.test.tsx
  ```

- [ ] **Step 8.2.2:** Adjust:
  - Component import: `from '../src/App'` (export `App`, not legacy's `SermonsApp`).
  - Render `<App config={mockConfig} />` instead of `<SermonsApp />`.
  - Mock `@perimeter/api-hooks` and `@perimeter/widget-runtime` as needed.

- [ ] **Step 8.2.3:** Run. Expected: PASS.

### Task 8.3: Create the widget entry

**Files:**
- Create: `widgets/sermons/src/index.tsx`

- [ ] **Step 8.3.1:** Create `widgets/sermons/src/index.tsx`:

  ```tsx
  import { defineWidget } from '@perimeter/widget-runtime';
  import './styles.css';
  import { App } from './App';
  import { SermonsConfigSchema } from './types';

  export default defineWidget({
    name: 'sermons',
    auth: 'none',
    schema: SermonsConfigSchema,
    App: ({ config }) => <App config={config} />,
  });
  ```

  Note: `SermonsConfigSchema` is the zod schema exported from `types.ts`. `defineWidget` accepts a zod schema and the runtime's `parseDataAttrs` will validate `data-*` against it.

### Task 8.4: Build the widget + bundle test

**Files:**
- Create: `widgets/sermons/tests/bundle.test.ts`

- [ ] **Step 8.4.1:** Build:

  Run: `pnpm --filter @perimeter/widget-sermons build`
  Expected: `dist/sermons/sermons.iife.js` exists.

  If the build fails because of react-pdf worker resolution, address per Step 7.3.3. If it fails because of nuqs Adapter usage, check that `<NuqsAdapter>` (or `<NuqsAdapter urlKeys={...}>`) wraps the children correctly; consult `nuqs` v2 docs.

- [ ] **Step 8.4.2:** Write `widgets/sermons/tests/bundle.test.ts`:

  ```ts
  import { describe, it, expect } from 'vitest';
  import { readFile } from 'node:fs/promises';
  import { gzipSync } from 'node:zlib';
  import path from 'node:path';

  const BUNDLE = path.resolve(__dirname, '../../../dist/sermons/sermons.iife.js');
  // Per-widget gz budget per the umbrella spec (raised in Phase 2 from 220 KB
  // to accommodate sermons's react-pdf + HLS.js + framer-motion + luxon +
  // nuqs + headlessui + lucide-react footprint).
  const BUDGET_BYTES = 500 * 1024;

  describe('sermons bundle', () => {
    it('is under the 500 KB gzipped budget', async () => {
      const raw = await readFile(BUNDLE);
      const gz = gzipSync(raw);
      expect(gz.byteLength).toBeLessThanOrEqual(BUDGET_BYTES);
    });

    it('contains the package version', async () => {
      const text = await readFile(BUNDLE, 'utf8');
      expect(text).toContain('0.0.0');
    });

    it('exposes the PerimeterWidgets global surface', async () => {
      const text = await readFile(BUNDLE, 'utf8');
      expect(text).toContain('PerimeterWidgets');
    });
  });
  ```

- [ ] **Step 8.4.3:** Run the bundle test:

  Run: `pnpm --filter @perimeter/widget-sermons test -- bundle`
  Expected: PASS.

  **If the budget is exceeded**, capture the actual gz size before reporting. Run this one-liner from the repo root to print the number loudly:

  ```bash
  node -e "const {gzipSync}=require('zlib'); const fs=require('fs'); const b=fs.readFileSync('dist/sermons/sermons.iife.js'); console.log((gzipSync(b).length/1024).toFixed(1)+' KB gz / '+ (b.length/1024).toFixed(1)+' KB raw');"
  ```

  Then STOP and surface the size in the report. The user chooses whether to raise the budget further, drop a dep, or escalate to code-splitting.

### Task 8.5: Quality + commit

- [ ] **Step 8.5.1:** Run repo-wide `pnpm quality`. Expected: exits 0.

- [ ] **Step 8.5.2:** Commit. Write `/tmp/commit-phase2-8.txt`:

  ```
  feat(widget-sermons): add App, entry, integration test, and bundle test

  Ports App.tsx with the useConfig → prop-drilling refactor. Wraps
  the tree in NuqsAdapter with a per-embed URL prefix. Entry index.tsx
  default-exports defineWidget({ name: 'sermons', schema, App }).
  App.test.tsx ported and passes. Bundle test enforces the 500 KB
  gzipped budget and verifies version + PerimeterWidgets global.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

  Then: `git add widgets/sermons && git commit -F /tmp/commit-phase2-8.txt && rm /tmp/commit-phase2-8.txt`.

### Chunk 8 acceptance

- Sermons widget builds to `dist/sermons/sermons.iife.js` under 500 KB gzipped.
- App.test, bundle test, and previously-ported tests all pass.
- `pnpm quality` exits 0.

---

## Chunk 9: Studio integration + final acceptance

**Outcome:** Sermons appears in Studio at `/widgets/sermons`. Native + As-shipped modes both render. Theme overrides propagate. All Phase 2 acceptance criteria from the spec verified.

### Task 9.1: Register sermons in Studio

**Files:**
- Modify: `apps/studio/src/lib/widgets-registry.ts`
- Modify: `apps/studio/src/lib/widget-definitions.ts`
- Modify: `apps/studio/package.json` (add `@perimeter/widget-sermons` dep)

- [ ] **Step 9.1.1:** Add `@perimeter/widget-sermons` to `apps/studio/package.json` dependencies:

  ```json
  "@perimeter/widget-sermons": "workspace:*",
  ```

  Run `pnpm install`.

- [ ] **Step 9.1.2:** Add a sermons entry in `apps/studio/src/lib/widget-definitions.ts`. The exact shape depends on what Chunk 8 of the Phase 1 plan produced — see lines 4079–4106 of `docs/superpowers/plans/2026-05-22-perimeter-widgets-phase-1-foundation.md` (or just open the file and copy the existing example pattern). Roughly:

  ```ts
  import sermonsDefinition from '@perimeter/widget-sermons';
  // ...add to the map alongside the example entry
  export const widgetDefinitions = {
    example: exampleDefinition,
    sermons: sermonsDefinition,
  } as const;
  ```

- [ ] **Step 9.1.3:** Add to `apps/studio/src/lib/widgets-registry.ts`:

  ```ts
  export const widgetEntries: WidgetEntry[] = [
    { slug: 'example', title: 'Example widget' },
    { slug: 'sermons', title: 'Sermons' },
  ];
  ```

  (Match the existing entry shape — read the file first.)

- [ ] **Step 9.1.4:** Update Studio's `pretest` script if needed. Currently it builds `@perimeter/widget-example`. The DOM-equality test for sermons would also need the sermons IIFE — but Studio's existing widget-preview tests are example-only. Sermons doesn't need to participate in those tests (its own bundle test covers the IIFE smoke). So leave the pretest alone.

### Task 9.2: Studio dev smoke

- [ ] **Step 9.2.1:** Build sermons (if not already):

  Run: `pnpm --filter @perimeter/widget-sermons build`
  Expected: produces `dist/sermons/sermons.iife.js`.

- [ ] **Step 9.2.2:** Start Studio dev:

  Run (background-ok): `pnpm --filter @perimeter/studio dev`
  Wait for "Ready in <ms>" log line.

- [ ] **Step 9.2.3:** Verify the widget-bundle route serves sermons:

  Run: `curl -sf http://localhost:3000/widget-bundles/sermons.js -o /tmp/sermons-bundle-fetch.js && ls -la /tmp/sermons-bundle-fetch.js`
  Expected: file exists, size ~hundreds of KB (raw, not gzipped).

- [ ] **Step 9.2.4:** Smoke-check route renders. Visit (or curl + grep):
  - `http://localhost:3000/widgets/sermons` — expect 200 with HTML containing references to NativeRenderer / AsShippedRenderer markup.

- [ ] **Step 9.2.5:** Stop the dev server.

### Task 9.3: Final acceptance walk

- [ ] **Step 9.3.1:** Clean install:

  Run: `rm -rf node_modules && pnpm install --frozen-lockfile`
  Expected: exits 0.

- [ ] **Step 9.3.2:** Build everything:

  Run: `pnpm build`
  Expected: exits 0; both `dist/example/example.iife.js` and `dist/sermons/sermons.iife.js` exist.

- [ ] **Step 9.3.3:** Repo-wide quality:

  Run: `pnpm quality`
  Expected: exits 0.

- [ ] **Step 9.3.4:** Walk every Phase 2 acceptance criterion from the spec:

  1. ✅ `pnpm install && pnpm quality` exits 0 — verified in 9.3.1 + 9.3.3.
  2. ✅ `pnpm --filter @perimeter/widget-sermons build` emits the IIFE under 500 KB gz — verified via bundle test in Chunk 8.
  3. ✅ `pnpm --filter @perimeter/widget-sermons test` runs ported widget tests green.
  4. ✅ `pnpm --filter @perimeter/api-hooks test` runs relocated hook tests green.
  5. ✅ Studio's `/widgets/sermons` renders the widget in Native + As-shipped — verified in 9.2.4.
  6. ✅ Theme overrides at `/theme` propagate to sermons — verified by manually editing a token and reloading sermons preview (do this in 9.2).
  7. ✅ `@perimeter/api-types` is in sync with the vendored spec — verified by regenerating and diffing:

     Run: `pnpm --filter @perimeter/api-types generate && git diff --exit-code packages/api-types/src/operations.ts`
     Expected: exits 0 (no diff).

  8. ✅ No production deploys. Confirm no `git push` ran (commands in the plan never include `git push`).

### Task 9.4: Final commit

- [ ] **Step 9.4.1:** Commit. Write `/tmp/commit-phase2-9.txt`:

  ```
  feat(studio): register @perimeter/widget-sermons in Studio

  Adds sermons to widgets-registry.ts and widget-definitions.ts so
  /widgets/sermons renders in Studio. Phase 2 acceptance walk
  complete: sermons builds under 500 KB gz, all tests pass, Studio
  smoke verifies both Native and As-shipped render modes.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

  Then: `git add apps/studio pnpm-lock.yaml && git commit -F /tmp/commit-phase2-9.txt && rm /tmp/commit-phase2-9.txt`.

### Chunk 9 acceptance

- Sermons appears in Studio.
- All 8 spec acceptance criteria pass.
- `pnpm quality` exits 0.

---

## Done.

Phase 2 is complete when Chunk 9 acceptance is met. WordPress still serves the legacy sermons URL. The next phase (Phase 3 — hosting + admin UI) has its own spec when ready.
