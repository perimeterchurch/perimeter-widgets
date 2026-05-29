# Perimeter Widgets Streamline — Phase 2 (Sermons Port) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the existing sermons widget onto the rebuilt Phase 1 platform — single mount path, `widgetConfig` build, `?inline` CSS — keeping all components/UX intact, so it builds to one self-contained IIFE and previews live in the Vite studio. **No production embed changes** (cutover is Phase 4).

**Architecture:** Sermons is largely already compatible — it uses `defineWidget` + `@perimeter/api-hooks` and already `React.lazy`-loads the heavy players (`PdfViewer`/`VideoPlayer`, which pull in react-pdf/pdfjs/hls.js). The port is therefore mostly mechanical contract changes plus **one real fix**: react-pdf's stylesheet imports (`AnnotationLayer.css`/`TextLayer.css`), which the old build swept into the single substituted CSS asset, must be routed through the widget's `styles.css` via `@import` so they reach the shadow root under the new `?inline`-CSS model. Re-add sermons to the workspace, split `index.tsx` → `widget.tsx` + `entry.ts`, swap the `@perimeter/api-types` import to `@perimeter/api-hooks`, switch `vite.config.ts` to `widgetConfig`, fix the bundle test, and verify build + studio preview + quality.

**Tech Stack:** Same as Phase 1 — Vite 6 (IIFE lib), React 19, TS 5.7 strict, Tailwind v3, Zod 3, Vitest/jsdom. Sermons-specific deps: react-pdf 10, pdfjs-dist 5, hls.js 1.6, luxon, nuqs, framer-motion, lucide-react.

**Spec:** `docs/superpowers/specs/2026-05-29-perimeter-widgets-streamline-redesign-design.md` (Phase 2).
**Depends on:** Phase 1 foundation (`feat/widgets-streamline-foundation` / PR #62). This plan assumes the Phase 1 platform is the base.

---

## Key decisions locked for this plan

1. **Execution branch:** `feat/widgets-streamline-sermons`. If Phase 1 (PR #62) has merged to `dev`, branch from `origin/dev`. If not yet merged, **stack** on `feat/widgets-streamline-foundation` (branch from it) and target that branch in the PR until Phase 1 lands, then retarget to `dev` (see superpowers:land-stacked-prs). Never commit to `dev`/`main`.
2. **react-pdf CSS → `styles.css` via `@import`.** Remove the two side-effect CSS imports from `PdfViewer.tsx` and add `@import` lines at the **top** of `widgets/sermons/src/styles.css` (before the `@tailwind` directives). This is the single CSS source that `entry.ts` imports `?inline` and `mount()` injects into the shadow root. Vite resolves CSS `@import` from `node_modules` at build time.
3. **No new lazy-loading work.** `PdfViewer`/`VideoPlayer` are already `React.lazy`-loaded via `MediaTabs.tsx`; the single-IIFE build inlines dynamic imports (defers init, not download) — this matches the spec's "self-contained now" decision. We do **not** restructure the players.
4. **Bundle budget: 900 KiB gz** per widget. (Originally 850 KiB, sized from the old platform's ~801 KiB sermons bundle. On the rebuilt platform the ported sermons bundle measures **~858.8 KiB gz** — ~58 KiB heavier; raised to 900 KiB by plan-owner decision on 2026-05-29 to land Phase 2, with headroom.) Two follow-ups are tracked, both **out of scope for Phase 2**: (a) the self-hosted-pdf-worker optimization the spec flags (could drop the bundle to ~500–600 KiB), and (b) investigating the ~58 KiB new-platform regression vs the old build.
5. **Same widget contract as Phase 1's `example`:** `src/widget.tsx` (defineWidget default, no CSS import) + `src/entry.ts` (`import css from './styles.css?inline'; … ensureGlobal(widget, css); autoMount(widget, css)`); `vite.config.ts` = `widgetConfig({ name: 'sermons' })`; `package.json` `exports` → `src/widget.tsx`.
6. **Test convention unchanged:** tests stay in `widgets/sermons/tests/`; `vitest.config.ts` keeps jsdom + setup + the `--no-experimental-webstorage` poolOptions (sermons doesn't use constructable stylesheets directly — it renders through `mount()` only in the built bundle / studio, not in unit tests, which mock the hooks and render components/`App` directly). Only `tests/bundle.test.ts` changes.

---

## File structure (changes)

```
perimeter-widgets/
├── pnpm-workspace.yaml                 # MODIFY: widgets/example → widgets/*  (re-include sermons)
└── widgets/sermons/
    ├── package.json                    # MODIFY: drop @perimeter/api-types dep; exports → src/widget.tsx
    ├── vite.config.ts                  # REPLACE: widgetConfig({ name: 'sermons' })
    ├── src/
    │   ├── widget.tsx                  # NEW: defineWidget default (from index.tsx, minus css import)
    │   ├── entry.ts                    # NEW: ?inline css + ensureGlobal + autoMount
    │   ├── index.tsx                   # DELETE
    │   ├── index.widget.d.ts           # DELETE (exports now point at widget.tsx)
    │   ├── vite-env.d.ts               # MODIFY: declare __PERIMETER_WIDGET_VERSION__
    │   ├── styles.css                  # MODIFY: @import react-pdf CSS at top
    │   ├── types.ts                    # MODIFY: import { operations } from '@perimeter/api-hooks'
    │   └── components/players/PdfViewer.tsx  # MODIFY: remove the 2 side-effect css imports
    └── tests/bundle.test.ts            # MODIFY: new dist/index.js path + self-contained build
```

Everything else under `widgets/sermons/src` (App, all components, hooks, lib) is **unchanged** — it already uses `@perimeter/api-hooks` and the surviving runtime API.

---

## Chunk 1: Branch + re-include sermons in the workspace

### Task 1.1: Branch and re-add sermons to the workspace

**Files:**
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Cut the branch.** If PR #62 is merged to dev: `git fetch origin --prune && git checkout -b feat/widgets-streamline-sermons origin/dev`. Otherwise stack: `git checkout feat/widgets-streamline-foundation && git checkout -b feat/widgets-streamline-sermons`. Record which base you used.
- [ ] **Step 2: Re-include sermons** — set `widgets` back to a glob in `pnpm-workspace.yaml`:

```yaml
packages:
  - 'studio'
  - 'packages/*'
  - 'widgets/*'
```

- [ ] **Step 3: Install.** Run `pnpm install`.
  Expected: sermons (`@perimeter/widget-sermons`) is now a workspace project. It will NOT typecheck/build yet (still on the old contract) — that's expected; do not run `pnpm quality` until Chunk 5.
- [ ] **Step 4: Confirm scope.** Run `pnpm -r list --depth -1 | grep widget-sermons` → present.
- [ ] **Step 5: Commit.**

```bash
git add pnpm-workspace.yaml
git commit -m "chore(widget-sermons): re-include sermons in the workspace for the Phase 2 port"
```

---

## Chunk 2: Port the widget contract

### Task 2.1: Split `widget.tsx` / `entry.ts`; fix the api-types import

**Files:**
- Create: `widgets/sermons/src/widget.tsx`
- Create: `widgets/sermons/src/entry.ts`
- Modify: `widgets/sermons/src/vite-env.d.ts`
- Modify: `widgets/sermons/src/types.ts`
- Delete: `widgets/sermons/src/index.tsx`, `widgets/sermons/src/index.widget.d.ts`

- [ ] **Step 1: Create `widgets/sermons/src/widget.tsx`** (the current `index.tsx` minus the CSS side-effect import):

```tsx
import { defineWidget } from '@perimeter/widget-runtime';
import { App } from './App';
import { SermonsConfigSchema } from './types';

export default defineWidget({
  name: 'sermons',
  auth: 'none',
  schema: SermonsConfigSchema,
  App: ({ config }) => <App config={config} />,
});
```

- [ ] **Step 2: Create `widgets/sermons/src/entry.ts`** (identical contract to `example`):

```ts
import css from './styles.css?inline';
import { autoMount, ensureGlobal } from '@perimeter/widget-runtime';
import widget from './widget';

widget.version = __PERIMETER_WIDGET_VERSION__;
ensureGlobal(widget, css);
autoMount(widget, css);
```

- [ ] **Step 3: Declare the version global** — **append** this line to the existing `widgets/sermons/src/vite-env.d.ts`. Do NOT overwrite the file: it already contains an `ImportMetaEnv`/`ImportMeta` augmentation (`VITE_API_URL`, `VITE_PDFJS_WORKER_URL`) that `PdfViewer.tsx` and the API config depend on. Just add:

```ts
declare const __PERIMETER_WIDGET_VERSION__: string;
```

(The `/// <reference types="vite/client" />` line is already present in that file — don't duplicate it.)

- [ ] **Step 4: Repoint the api-types import** in `widgets/sermons/src/types.ts` line 2:

```ts
import type { operations } from '@perimeter/api-hooks';
```

(All eight `operations[...]` type derivations below it are unchanged — `@perimeter/api-hooks` re-exports `operations` identically.)

- [ ] **Step 5: Delete the old entry + typings file.**

```bash
git rm widgets/sermons/src/index.tsx widgets/sermons/src/index.widget.d.ts
```

- [ ] **Step 6: Commit.**

```bash
git add widgets/sermons/src/widget.tsx widgets/sermons/src/entry.ts widgets/sermons/src/vite-env.d.ts widgets/sermons/src/types.ts
git commit -m "feat(widget-sermons): split widget.tsx/entry.ts on the single-mount contract; api-types -> api-hooks"
```

### Task 2.2: Switch build config + package metadata

**Files:**
- Replace: `widgets/sermons/vite.config.ts`
- Modify: `widgets/sermons/package.json`

- [ ] **Step 1: Replace `widgets/sermons/vite.config.ts`:**

```ts
import { defineConfig } from 'vite';
import { widgetConfig } from '@perimeter/vite-plugin-widget';

export default defineConfig(widgetConfig({ name: 'sermons' }));
```

- [ ] **Step 2: Update `widgets/sermons/package.json`:**
  - Remove the `"@perimeter/api-types": "workspace:*"` dependency (package no longer exists).
  - Change `exports` to point at the widget module:
    ```json
    "exports": {
      ".": {
        "types": "./src/widget.tsx",
        "default": "./src/widget.tsx"
      }
    }
    ```
  - Leave all other deps (react-pdf, pdfjs-dist, hls.js, luxon, nuqs, framer-motion, lucide-react, @perimeter/* etc.) and the `dev`/`build`/`lint`/`typecheck`/`test` scripts as-is.

- [ ] **Step 3: Install** to drop the api-types dependency edge: `pnpm install`.
  Expected: succeeds; `grep "@perimeter/api-types" pnpm-lock.yaml` → no matches.

- [ ] **Step 4: Commit.**

```bash
git add widgets/sermons/vite.config.ts widgets/sermons/package.json pnpm-lock.yaml
git commit -m "feat(widget-sermons): build via widgetConfig(); drop api-types dependency"
```

---

## Chunk 3: Route react-pdf CSS through the shadow root

### Task 3.1: Move react-pdf stylesheet imports into `styles.css`

The new model injects only `styles.css?inline` into the shadow root. react-pdf's `AnnotationLayer.css`/`TextLayer.css` are currently side-effect-imported in `PdfViewer.tsx`; under a single-IIFE lib build those would be emitted as a stray asset or leak to `document.head` and never reach the shadow root, breaking PDF text/annotation rendering. Route them through `styles.css` so they travel with the inline CSS string.

**Files:**
- Modify: `widgets/sermons/src/styles.css`
- Modify: `widgets/sermons/src/components/players/PdfViewer.tsx`

- [ ] **Step 1: Update `widgets/sermons/src/styles.css`** — add the react-pdf imports at the very top (CSS `@import` must precede other rules):

```css
@import 'react-pdf/dist/Page/AnnotationLayer.css';
@import 'react-pdf/dist/Page/TextLayer.css';
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: Remove the side-effect imports** from `widgets/sermons/src/components/players/PdfViewer.tsx` (the two lines):

```ts
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
```

Leave the rest of `PdfViewer.tsx` untouched (the `react-pdf` component imports, the `pdfjs-dist/build/pdf.worker.min.mjs?raw` worker import, and the `GlobalWorkerOptions.workerSrc` blob setup all stay — `?raw` is supported by the plain Vite lib build, no Turbopack involved).

- [ ] **Step 3: Verify the imports resolve at build time** (smoke): `pnpm --filter @perimeter/widget-sermons build` should complete without "failed to resolve import 'react-pdf/dist/Page/AnnotationLayer.css'". (Full bundle assertions are Chunk 4.) If resolution fails, confirm the exact paths exist under `node_modules/react-pdf/dist/Page/` and adjust to the package's actual published CSS paths.

- [ ] **Step 4: Commit.**

```bash
git add widgets/sermons/src/styles.css widgets/sermons/src/components/players/PdfViewer.tsx
git commit -m "fix(widget-sermons): route react-pdf CSS through styles.css for shadow-root injection"
```

---

## Chunk 4: Build, bundle test, and size budget

### Task 4.1: Rewrite the bundle test for the new output

**Files:**
- Modify: `widgets/sermons/tests/bundle.test.ts`

The current test reads `../../../dist/sermons/sermons.iife.js`; the new build emits the widget-local `dist/index.js`.

- [ ] **Step 1: Replace `widgets/sermons/tests/bundle.test.ts`** with a self-contained build + assertions, including the size-budget check:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const bundle = path.join(distDir, 'index.js');
const BUDGET_GZ = 900 * 1024; // spec per-widget budget

beforeAll(() => {
  execSync('pnpm exec vite build', { cwd: root, stdio: 'inherit' });
}, 180_000);

describe('built sermons bundle', () => {
  it('emits a single IIFE at dist/index.js', () => {
    expect(existsSync(bundle)).toBe(true);
  });
  it('inlines CSS — no separate .css asset is emitted', () => {
    expect(readdirSync(distDir).some((f) => f.endsWith('.css'))).toBe(false);
  });
  it('self-mounts and embeds the version', () => {
    const code = readFileSync(bundle, 'utf8');
    expect(code).toContain('sermons');
    expect(code).toContain('PerimeterWidgets');
  });
  it('stays within the 900 KB gz budget', () => {
    const gz = gzipSync(readFileSync(bundle)).length;
    // Surface the measured size in the test output regardless of pass/fail.
    console.log(`sermons bundle: ${(gz / 1024).toFixed(1)} KB gz (budget ${(BUDGET_GZ / 1024).toFixed(0)} KB)`);
    expect(gz).toBeLessThanOrEqual(BUDGET_GZ);
  });
});
```

- [ ] **Step 2: Run the bundle test.**

Run: `pnpm exec turbo run test --filter=@perimeter/widget-sermons`
Expected: PASS, including the budget check. If the budget assertion FAILS, do **not** weaken it silently — record the measured gz size, report it as a blocker, and stop (per decision #4 the fix is a separate optimization, not part of this port).

- [ ] **Step 3: Commit.**

```bash
git add widgets/sermons/tests/bundle.test.ts
git commit -m "test(widget-sermons): assert single-IIFE build + 900KB gz budget"
```

### Task 4.2: Confirm the rest of the sermons suite passes on the new platform

The non-bundle tests mock `@perimeter/api-hooks` and render components/`App` directly (jsdom), so they should be unaffected by the contract change. Verify.

- [ ] **Step 1: Run the full sermons suite + typecheck + lint.**

Run: `pnpm exec turbo run test typecheck lint --filter=@perimeter/widget-sermons`
Expected: PASS. Likely-affected spots to check if anything fails:
- `tests/App.test.tsx` imports `App` + `SermonsConfigSchema` (from `./types`) — unaffected by the entry split.
- `tests/types.test.ts` imports `SermonsConfigSchema` — the `operations` type import now resolves via `@perimeter/api-hooks`; types-only, no runtime change.
- `tests/components/players/PdfViewer.test.tsx` + `tests/setup.ts` (which stubs `URL.createObjectURL`) — unaffected by moving the CSS imports out of `PdfViewer.tsx` (the test doesn't assert on those stylesheets).

- [ ] **Step 2: Commit** only if a fix was required (otherwise skip):

```bash
git commit -am "fix(widget-sermons): adjust tests after contract port"
```

---

## Chunk 5: Studio integration, quality gate, docs

### Task 5.1: Verify the studio discovers and previews sermons

**Files:** none (verification).

- [ ] **Step 1:** With the workspace glob now including sermons and `src/widget.tsx` present, the studio's `import.meta.glob('/widgets/*/src/widget.tsx')` picks up sermons automatically. Run `pnpm --filter @perimeter/studio dev`.
- [ ] **Step 2:** In the studio, select **sermons**: confirm it mounts live in a shadow root through the real `mount()`, the series/sermon views render (against `api.perimeter.org` — or with the network blocked, that it renders its loading/empty states without throwing), the embed snippet shows `data-perimeter-widget="sermons"`, and theme-token edits apply. Open a sermon with a PDF and confirm the react-pdf text/annotation layers are styled (proves the `@import` CSS reached the shadow root).
- [ ] **Step 3:** Build the IIFE (`pnpm --filter @perimeter/widget-sermons build`) and load `dist/index.js` in a throwaway HTML page with `<div data-perimeter-widget="sermons" data-limit="6"></div>`; confirm it self-mounts and renders identically to the studio preview (parity check). Delete the file after. Record both results in the PR description.

### Task 5.2: Green quality gate + docs

- [ ] **Step 1: Format + full gate.**

Run: `pnpm format && pnpm quality`
Expected: PASS across the whole workspace **including** `@perimeter/widget-sermons` now.

- [ ] **Step 2: Update `perimeter-widgets/CLAUDE.md`** — note sermons is ported to the new platform and is back in the workspace; remove any lingering "sermons set aside" language from the Phase 1 doc state.

- [ ] **Step 3: Commit.**

```bash
git add perimeter-widgets/CLAUDE.md
git commit -am "chore(widget-sermons): quality gate green + docs after Phase 2 port"
```

### Task 5.3: PR

- [ ] **Step 1:** Push `feat/widgets-streamline-sermons`. Open a PR with `--body-file` (write the body with the Write tool). If stacked on Phase 1, target `feat/widgets-streamline-foundation` and note the stack; once Phase 1 merges, retarget to `dev` (superpowers:land-stacked-prs). Body: what ported, the react-pdf-CSS fix, the measured bundle gz size vs the 900 KiB budget, the parity-check result, and that production embeds are still on the legacy URL (cutover is Phase 4).
- [ ] **Step 2:** Run superpowers:requesting-code-review before requesting human review.

---

## Done-when (Phase 2 acceptance)

- `pnpm quality` green across the workspace **including** `@perimeter/widget-sermons`.
- Sermons builds to a single self-contained `dist/index.js` IIFE with **no separate CSS asset**, at or under **900 KiB gz** (measured size recorded).
- The studio previews sermons live through the real `mount()`, including PDF rendering with correct react-pdf layer styling inside the shadow root.
- The built IIFE self-mounts on `data-perimeter-widget="sermons"` and renders identically to the studio preview.
- `@perimeter/api-types` is referenced nowhere; sermons depends on `@perimeter/api-hooks`.
- No production embed has changed (legacy URL still serves sermons until Phase 4).
```
