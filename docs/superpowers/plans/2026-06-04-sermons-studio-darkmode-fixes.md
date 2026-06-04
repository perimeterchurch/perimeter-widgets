# Sermons + Studio Fixes & Platform Dark Mode — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship platform dark mode (dark token set + `data-theme="dark"` activation, embeddable), tokenize + make the sermons widget responsive (container queries), fix the studio (scroll, slide-out inspector drawer, light/dark toggle), and unify the dev API on `localhost:5500` so data + images load — then update the docs.

**Architecture:** Dark mode is a CSS-variable swap: `@perimeter/theme` gains `darkTokens`; `resolveTokens()` emits `:host{light}` + `:host([data-theme="dark"]){dark}` into the existing per-instance token sheet; the host element's `data-theme="dark"` attribute (verified safe through the data-attrs parser + non-strict zod schema) activates it with zero mount parsing. Sermons stops hardcoding `stone-*` and uses semantic tokens, so dark cascades; its grids switch from viewport breakpoints to container-query variants via the `@tailwindcss/container-queries` plugin added to the theme preset. The studio fixes are local (a `min-h-0` flex chain; an overlay drawer replacing the right column; a theme toggle that sets `data-theme` on the preview host; a DEV-only dev-API origin fed to both the runtime and `format.ts`).

**Tech Stack:** React 19, Tailwind 3 + `@tailwindcss/container-queries`, zod, vitest/happy-dom, Vite 6. Spec: `docs/superpowers/specs/2026-06-04-sermons-studio-darkmode-fixes-design.md`. Read it first.

---

## Context for a zero-context engineer (verified against the code)

- **Theme:** `packages/theme/src/tokens.ts` exports only `globalTokens` (light; keys `color-bg/fg/muted/muted-fg/primary(+fg)/secondary(+fg)/accent(+fg)/destructive(+fg)/border/ring`, `radius-sm/md/lg`, `font-sans/mono`). `resolver.ts` `resolveTokens()` emits one `:host { --<k>: <v> }` block (`cssText`). The Tailwind preset (`tailwind.ts`) maps `color-*`→Tailwind colors (`bg-bg`, `text-fg`, `text-muted-fg`, `bg-muted`, `border-border`, `bg-primary`, …) and has **no `plugins` array yet**.
- **Runtime:** `mount.tsx` injects `resolveTokens(...).cssText` via `applyStyles` (`styling.ts`) into a per-instance **token sheet**; `updateTokens` regenerates the full `cssText` and replaces that sheet. The host element (`host.attachShadow`) is the `[data-perimeter-widget]` div. `DEFAULT_API_URL = globalThis.__PERIMETER_API_URL__ || 'https://api.perimeter.org'`. `data-attrs.ts`: `data-theme-<token>`→themeOverrides; a bare `data-theme` is NOT prefixed, becomes a `theme` config key, which `schema.parse` **strips** (non-strict zod) — and attributes are never removed, so `data-theme="dark"` survives on the host. (Verified.)
- **Sermons:** local components hardcode `stone-*` with dead `dark:` variants (audit lists: `components/sermons/SermonDetail.tsx`, `components/series/SeriesDetail.tsx`, `components/players/{AudioPlayer,VideoPlayer,PdfViewer}.tsx`, `components/ui/{ImagePlaceholder,DatePicker,DateRangePicker}.tsx`, and any others). `@perimeter/ui` components already use tokens. Grids use viewport breakpoints: `SermonGrid.tsx:18`, `SeriesGrid.tsx:52`, skeletons in `SermonsView.tsx:185` + `SeriesView.tsx:194` (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). Root is `App.tsx` `<div className="p-4">` (~line 100). Image URLs: `lib/format.ts` `resolveApiBaseUrl()` (config `apiUrl` → `VITE_API_URL` → dev `''` / prod `api.perimeter.org`); `sermonImageUrl`/`seriesImageUrl` build `<base>/api/sermons/...`.
- **Studio:** `WidgetPage.tsx` is `grid … xl:grid-cols-[1fr_22rem]` with `<Canvas>` + an `<aside>` Inspector; the grid cell has `overflow-hidden`. `Canvas.tsx` root `flex h-full flex-col`, scroll surface `flex-1 overflow-auto p-6` (no `min-h-0`), background buttons white/gray/dark/host-sim, DEV-only Source⇄Built toggle. `WidgetPreview.tsx` host is `<div data-perimeter-widget-preview hidden=…/>`, mounts via `mount(host, def, css, { configOverrides })` — **no `apiBaseUrl`**. `Inspector.tsx` = Base UI `Tabs` (Config/Theme/Info). No `studio/.env*`; no `VITE_API_URL`/`__PERIMETER_API_URL__`/`5500` anywhere.

Repo rules: pnpm only; never commit to `dev`/`main` (branch `feat/sermons-studio-fixes`); conventional commits; `pnpm format` before `pnpm quality`; tests via `pnpm exec turbo run test --filter=<pkg> --force`; studio runtime bugs are invisible to typecheck/build (exercise the render path with happy-dom tests); the studio quality gate is now self-contained (the test task builds deps); `docs/` is `.prettierignore`'d (studio build validates MDX). PR bodies via the Write tool + `gh pr create --body-file`.

---

## Chunk 1: Platform dark mode (theme + runtime)

### Task 1: Branch + `darkTokens`

**Files:** `packages/theme/src/tokens.ts`; test `packages/theme/tests/`

- [ ] **Step 1:** `git fetch --prune && git checkout -B feat/sermons-studio-fixes origin/dev`. Baseline: `pnpm install` then `pnpm exec turbo run test --filter=@perimeter/theme --force` (green).
- [ ] **Step 2: Failing test** — assert `darkTokens` exports, has the **same keys** as `globalTokens`, and differs on the surface colors:

```ts
import { describe, expect, it } from 'vitest';
import { globalTokens, darkTokens } from '../src/tokens';

describe('darkTokens', () => {
  it('has exactly the same keys as globalTokens', () => {
    expect(Object.keys(darkTokens).sort()).toEqual(Object.keys(globalTokens).sort());
  });
  it('inverts the core surface colors', () => {
    expect(darkTokens['color-bg']).not.toBe(globalTokens['color-bg']);
    expect(darkTokens['color-fg']).not.toBe(globalTokens['color-fg']);
  });
});
```

- [ ] **Step 3:** Run `pnpm exec turbo run test --filter=@perimeter/theme --force` → FAIL.
- [ ] **Step 4: Implement** `darkTokens` in `tokens.ts` — a dark palette over the SAME keys as `globalTokens`. Dark values (hsl), e.g. `color-bg: hsl(222 47% 11%)`, `color-fg: hsl(210 40% 98%)`, `color-muted: hsl(217 33% 17%)`, `color-muted-fg: hsl(215 20% 65%)`, `color-border: hsl(217 33% 20%)`, keep `radius-*`/`font-*` identical to light, and pick sensible dark primary/secondary/accent/destructive(+fg) values (readable contrast). Keep the existing `globalTokens` and `ThemeToken` type; derive nothing that breaks them. Export `darkTokens` typed `Record<ThemeToken, string>`.
- [ ] **Step 5:** Run tests → PASS. Commit: `feat(theme): dark token set`.

### Task 2: `resolveTokens` emits the dark block

**Files:** `packages/theme/src/resolver.ts`; test `packages/theme/tests/`

- [ ] **Step 1: Failing test** — `cssText` contains both blocks, dark uses dark values, and overrides layer onto both:

```ts
import { describe, expect, it } from 'vitest';
import { resolveTokens } from '../src/resolver';
import { darkTokens } from '../src/tokens';

describe('resolveTokens dark block', () => {
  it('emits :host and :host([data-theme="dark"])', () => {
    const { cssText } = resolveTokens({});
    expect(cssText).toContain(':host {');
    expect(cssText).toContain(':host([data-theme="dark"]) {');
    expect(cssText).toContain(`--color-bg: ${darkTokens['color-bg']};`);
  });
  it('applies runtime overrides to BOTH light and dark blocks', () => {
    const { cssText } = resolveTokens({ runtimeOverrides: { 'color-primary': 'rebeccapurple' } });
    const dark = cssText.slice(cssText.indexOf(':host(['));
    const light = cssText.slice(0, cssText.indexOf(':host(['));
    expect(light).toContain('--color-primary: rebeccapurple;');
    expect(dark).toContain('--color-primary: rebeccapurple;');
  });
});
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.** In `resolveTokens`, build the light merge as today (`globalTokens` + overrides) AND a dark merge (`darkTokens` + the same `widgetOverrides`/`parsedDataAttrs`/`runtimeOverrides`). Emit:

```
:host {\n<light decls>\n}\n:host([data-theme="dark"]) {\n<dark decls>\n}
```

Keep `ResolvedTokens.tokens` as the LIGHT merged set (back-compat — verified only the theme's own tests read `.tokens`; `.cssText` is the only production-consumed output, so this is safe). The `cssText` is the only changed output shape.

- [ ] **Step 3b: Update the existing single-block test.** `packages/theme/tests/resolver.test.ts` (~lines 53–58) asserts the OLD single-block shape (`cssText.startsWith(':host')` AND a per-token `--` decl count). The two-block emission doubles the decl count and adds the `:host([data-theme="dark"])` selector, so that assertion WILL fail. Update it to the new shape: assert two `:host` occurrences (`cssText.match(/:host/g)!.length === 2`) and per-block decl counts (each block has one decl per token). Read the file first and adapt to its exact assertions.
- [ ] **Step 4:** Run `pnpm exec turbo run test --filter=@perimeter/theme --force` → PASS (including the updated existing test). Also run dependents to catch any cssText-shape assumption: `pnpm exec turbo run test --filter=...@perimeter/theme --force` (leading dots = dependents; watch widget-runtime/studio).
- [ ] **Step 5:** Commit: `feat(theme): resolveTokens emits a dark :host([data-theme=dark]) block`.

### Task 3: Runtime activation guard test

**Files:** test in `packages/widget-runtime/tests/` (mount/styling); no runtime code change expected (activation is pure CSS + the surviving attribute)

- [ ] **Step 1: Failing/﻿characterization test** (happy-dom) — mount a trivial widget on a host that has `data-theme="dark"`; assert (a) `mount` does NOT throw (guards the non-strict-schema assumption the activation relies on), (b) the host still carries `data-theme="dark"` after mount (not stripped), (c) the injected token CSS contains the `:host([data-theme="dark"])` block. Use the existing mount test harness/fixtures.
- [ ] **Step 2:** Run `pnpm exec turbo run test --filter=@perimeter/widget-runtime --force`. If it passes immediately (likely — the design needs no code change), that's fine: it's a regression guard. If it throws, the schema/parse path needs the documented handling — fix minimally and note it.
- [ ] **Step 3:** Commit: `test(widget-runtime): data-theme=dark activates dark tokens without mount changes`.

---

## Chunk 2: Sermons tokenize + responsive

### Task 4: Container-queries plugin in the theme preset

**Files:** `packages/theme/package.json`, `packages/theme/src/tailwind.ts`; `widgets/sermons` picks it up via the preset

- [ ] **Step 1:** Add `@tailwindcss/container-queries` to `packages/theme` dependencies: `pnpm --filter @perimeter/theme add @tailwindcss/container-queries`. Add it to the preset's `plugins` array in `tailwind.ts`:

```ts
import containerQueries from '@tailwindcss/container-queries';
// ...
export const tailwindPreset: Config = {
  content: [],
  plugins: [containerQueries],
  theme: { extend: { colors, borderRadius, fontFamily: { /* unchanged */ } } },
};
```

- [ ] **Step 2: Verify the variants generate.** Build a quick proof: add a throwaway `@container`/`@sm:` class usage isn't needed — instead confirm via the sermons build in Task 5. For now: `pnpm install` succeeds and `pnpm --filter @perimeter/theme typecheck` is green (the plugin is typed). Commit: `feat(theme): enable container-queries in the widget preset`.

### Task 5: Sermons responsive — container variants

**Files:** `widgets/sermons/src/App.tsx`; `components/sermons/SermonGrid.tsx`, `components/series/SeriesGrid.tsx`, `components/sermons/SermonsView.tsx`, `components/series/SeriesView.tsx` (skeletons), and the filter row if it uses viewport breakpoints

- [ ] **Step 1:** Mark the widget root a container: in `App.tsx`, the root `<div className="p-4">` → `<div className="@container p-4">` (the plugin maps `@container` to `container-type: inline-size`).
- [ ] **Step 2:** Rewrite the grids + skeletons from viewport → container variants: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3` → `grid grid-cols-1 gap-4 @sm:grid-cols-2 @lg:grid-cols-3` in `SermonGrid.tsx`, `SeriesGrid.tsx`, and the two skeleton blocks. Audit the filter row / tabs for `sm:`/`md:`/`lg:` and convert any layout-affecting ones to `@`-variants. (Container breakpoint names `@sm/@md/@lg` default to 24rem/28rem/32rem — fine for these grids; if a specific px is wanted use arbitrary `@min-[480px]:`.)
- [ ] **Step 3: Verify the build emits the variants.** `pnpm --filter ./widgets/sermons build` succeeds; grep the built CSS (inlined in the JS) for `container-type` (more robust than `@container`, which may be escaped as `.\@container` after minification): `grep -c 'container-type' widgets/sermons/dist/index.js` → nonzero. Confirm sermons gz still < 900 KiB (the bundle test). (The studio preview inherits the plugin via the `@perimeter/theme` preset — it renders the `@`-variants too, no studio config change needed.)
- [ ] **Step 4: Manual/visual note:** in the studio, at Mobile (375)/Tablet (768)/Desktop (1280) presets the grid should show 1/2/3 columns by CONTAINER width. (Verified visually in Task 11; here just confirm the build + a render test if practical.)
- [ ] **Step 5:** Commit: `fix(sermons): responsive via container queries (was viewport breakpoints)`.

### Task 6: Sermons tokenize (kill hardcoded stone-*)

**Files:** all sermons local components the audit flagged (SermonDetail, SeriesDetail, AudioPlayer, VideoPlayer, PdfViewer, ImagePlaceholder, DatePicker, DateRangePicker, + any other `stone-`/`bg-white`/`text-black`/hex user found via grep)

- [ ] **Step 1: Enumerate.** `grep -rnE 'stone-|bg-white|text-black|text-gray-|bg-slate-|bg-gray-|\[#' widgets/sermons/src` → the full hit list (includes arbitrary hex like `bg-[#...]`). This is the work surface (~88 `stone-` + ~82 other hits expected).
- [ ] **Step 2: Map + replace** each hardcoded color to a semantic token utility, removing the now-dead `dark:` pairs:
  - text: `text-stone-900` → `text-fg`; `text-stone-500/600/400` → `text-muted-fg`; on dark overlays (`text-white` over video) keep literal where it's intentionally on media, but flag it.
  - surfaces: `bg-stone-50/100` (page/subtle) → `bg-muted`; card surfaces → `bg-bg`; hovers `hover:bg-stone-100/200` → `hover:bg-muted`.
  - borders: `border-stone-200/700` → `border-border`.
  - Remove paired `dark:` variants (e.g. `text-stone-900 dark:text-stone-100` → `text-fg`).
  - Player chrome that's intentionally always-dark (video controls over a black `<video>`) may keep literal black/white — note which, don't force tokens where the design is media-overlay, not themeable surface.
- [ ] **Step 3: Guard.** `grep -rn 'stone-' widgets/sermons/src` → only intentional exceptions remain (ideally zero); record any kept literal + why.
- [ ] **Step 4:** `pnpm --filter ./widgets/sermons build` succeeds; `pnpm exec turbo run test --filter=@perimeter/widget-sermons --force` green; bundle gz < 900 KiB.
- [ ] **Step 5:** Commit: `fix(sermons): use semantic theme tokens so theming + dark mode cascade`.

---

## Chunk 3: Studio — scroll, drawer, theme toggle, dev API

### Task 7: Scroll fix

**Files:** `studio/src/components/Canvas.tsx`, `studio/src/pages/WidgetPage.tsx`; test `studio/src/components/Canvas.test.tsx`

- [ ] **Step 1: Failing/structural test** if feasible (happy-dom can't measure real scroll, so assert the classes): the Canvas scroll surface has `overflow-auto` AND `min-h-0`; the root flex column has `min-h-0`. (If a class-assertion test is too brittle, cover via the manual note + the existing render test that the canvas renders.)
- [ ] **Step 2: Fix.** Add `min-h-0` to: the `Canvas` root `flex h-full flex-col` → `flex h-full min-h-0 flex-col`; the scroll surface `flex-1 overflow-auto p-6` → add `min-h-0`. In `WidgetPage.tsx`, the grid cell containing the canvas (and the grid itself) get `min-h-0` so the `overflow-hidden` grid doesn't clip a non-scrolling child. Trace the full flex/grid chain from `main` (Layout `overflow-auto`) down and ensure each scroll ancestor can shrink (`min-h-0`/`min-w-0`).
- [ ] **Step 3:** Run `pnpm exec turbo run test --filter=@perimeter/studio --force` → green. Manual note (Task 11): a tall sermons preview scrolls within the canvas.
- [ ] **Step 4:** Commit: `fix(studio): preview canvas scrolls (min-h-0 flex chain)`.

### Task 8: Inspector → slide-out overlay drawer + theme toggle

**Files:** `studio/src/pages/WidgetPage.tsx` (layout), `studio/src/components/Inspector.tsx` (vertical layout), maybe a new `studio/src/components/InspectorDrawer.tsx`; `studio/src/components/Canvas.tsx` (theme toggle); `studio/src/components/WidgetPreview.tsx` (apply `data-theme`); tests in `studio/src/...test.tsx`

- [ ] **Step 1: Failing tests** (happy-dom): (a) the inspector drawer is closed by default (its content not in the document / `hidden`), a toggle button with an accessible name opens it (content appears) and a close control / Escape closes it; (b) a light/dark theme toggle in the canvas toolbar, when set to dark, results in `data-theme="dark"` on the `[data-perimeter-widget-preview]` host (and removed/`light` when toggled back).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Drawer.** `@perimeter/ui` has **no** Dialog/Drawer/Sheet primitive (only `Tabs` is wrapped) — hand-roll the drawer; don't look for `@perimeter/ui/dialog`. Replace `WidgetPage`'s `xl:grid-cols-[1fr_22rem]` column + `<aside>` with: the `<Canvas>` full-width, plus a hand-rolled drawer (own component, e.g. `InspectorDrawer.tsx`): closed by default; a toggle button (page header or canvas toolbar, accessible label e.g. "Inspector"); when open, a fixed/absolute right-side panel (~22–24rem, full height of the content region) over the preview with a semi-transparent backdrop; close on backdrop click, a close button, and an Escape `keydown` listener (no primitive backs this — add it explicitly, and return focus to the toggle on close); `role="dialog"` + `aria-label` + `aria-modal`. Inside, render `<Inspector>` (Config/Theme/Info tabs stacked vertically, comfortable padding). Keep it scrollable (`overflow-y-auto`).
- [ ] **Step 4: Theme toggle.** Add a light/dark control to the `Canvas` toolbar (segmented or switch, distinct from the background-surface buttons). **State wiring (Canvas takes the preview as opaque `children`, so it can't hand a prop to `WidgetPreview` directly):** lift a `theme: 'light' | 'dark'` state into `WidgetPage`'s `WidgetView` (alongside the existing `configOverrides`/`tokenOverrides`), pass `theme` down to `<WidgetPreview theme={theme}>`, AND pass `theme` + `onThemeChange` into `<Canvas>` for the toolbar control to render/drive. `WidgetPreview` then sets/removes `data-theme="dark"` on its `hostRef` div (the shadow host — NOT the HostFrame wrapper) in an effect; setting it unconditionally is harmless even while the host is `hidden` on a mount error. (`:host([data-theme=dark])` matches the host div; verify in the manual check it themes the widget even under the host-sim background.)
- [ ] **Step 5:** Run `pnpm exec turbo run test --filter=@perimeter/studio --force` → PASS. Confirm the studio still builds and the prod build stays a clean read-only gallery (no new DEV-only leakage; the drawer/toggle ship in both — they're fine in the deployed gallery).
- [ ] **Step 6:** Commit: `feat(studio): slide-out inspector drawer + light/dark preview toggle`.

### Task 9: Dev API → localhost:5500 (data + images)

**Files:** `studio/vite.config.ts` (or `studio/.env.development`), `studio/src/main.tsx` and/or `studio/src/components/WidgetPreview.tsx`

- [ ] **Step 1: Images path (`format.ts` reads `VITE_API_URL`).** Provide `VITE_API_URL=http://localhost:5500` to the studio dev build — either a `define`/`server` env in `studio/vite.config.ts` gated to dev, or a `studio/.env.development` with `VITE_API_URL=http://localhost:5500`. (Because the widget source is compiled by the studio's Vite, `format.ts`'s `import.meta.env.VITE_API_URL` resolves to this.) Confirm it's DEV-only (prod studio build must NOT bake localhost — verify the prod build output has no `localhost:5500`).
- [ ] **Step 2: Data/hooks path (runtime).** Make the runtime use the same origin in dev: in `studio/src/main.tsx` (DEV-only) set `globalThis.__PERIMETER_API_URL__ = 'http://localhost:5500'` so `mount`'s `DEFAULT_API_URL` resolves there — OR pass `apiBaseUrl: import.meta.env.DEV ? 'http://localhost:5500' : undefined` in `WidgetPreview`'s `mount(...)` call. Pick one; ensure BOTH data and images now resolve to `:5500` in dev. (These are independent code paths — verify both, per the spec.)
- [ ] **Step 3: Verify.** With local perimeter-api NOT assumed running in CI, this is a dev-wiring change — verify by: (a) the studio still builds and tests pass; (b) confirm the runtime knob is set (grep `studio/src` for the `__PERIMETER_API_URL__` set or the `apiBaseUrl` pass in `WidgetPreview`) and that `.env.development` carries `VITE_API_URL` (the image knob, consumed by `format.ts` inside the studio-compiled sermons module — not in `studio/src`); (c) a render/unit assertion if practical that `WidgetPreview` passes the dev base or sets the global. The live data/image load is the manual check in Task 11 (needs perimeter-api running).
- [ ] **Step 4:** Commit: `fix(studio): dev studio targets local perimeter-api (localhost:5500) for data + images`.

---

## Chunk 4: Docs + finalize

### Task 10: Docs

**Files:** the embed/hosting doc (`docs/hosting-and-release.md` and/or `docs/reference/embed-guide.md`), the run/setup guidance (`docs/guides/developer-setup.md` and/or `docs/guides-mdx/building-a-widget-end-to-end.mdx`), the dark-mode note in `docs/guides-mdx/styling-widgets.mdx`

- [ ] **Step 1: Embed `data-theme`.** Document the `data-theme="dark"` embed attribute (default light) in the embed/hosting doc — `<div data-perimeter-widget="sermons" data-theme="dark">` — and the one-line constraint that widget schemas must stay non-strict (so the attribute isn't rejected).
- [ ] **Step 2: Studio needs local API.** Document that the dev studio expects the local perimeter-api running (`cd perimeter-api && pnpm dev` → `:5500`) for data + images, and that dev targets `localhost:5500` automatically. Add to the studio run instructions + the building-a-widget guide.
- [ ] **Step 3: Dark mode in the styling guide.** Add a short section to `styling-widgets.mdx`: use semantic tokens (not hardcoded colors) so dark mode + theming cascade; how to preview dark in the studio (the toggle); the `data-theme` embed attribute.
- [ ] **Step 4:** `pnpm --filter @perimeter/studio build` (MDX validity). Commit: `docs: dark-mode embed attribute + studio-needs-local-api + tokens-for-theming`.

### Task 11: Finalize — gate, visual check, PR

- [ ] **Step 1: Full gate.** `pnpm format`, `pnpm quality`, and `pnpm exec turbo run test --filter=@perimeter/theme --filter=@perimeter/widget-runtime --filter=@perimeter/widget-sermons --filter=@perimeter/studio --force`. All green; sermons gz < 900 KiB.
- [ ] **Step 2: Visual verification (headless-substitute + note).** The manual checks (sermons data + images load against local API, grid reflows by container width across presets, dark toggle renders dark cards, preview scrolls) need the studio + local perimeter-api running, which the workflow can't drive headlessly. Do what IS verifiable: studio build green, render tests green, the container-query + token + dark-block grep proofs from Tasks 5/6/2, and the prod build has no `localhost:5500`. Record exactly what was machine-verified vs left for the user's manual studio check.
- [ ] **Step 3: PR.** Push `feat/sermons-studio-fixes`; PR body via the Write tool (the six fixes + the dark-mode mechanism + the dev-API requirement + what's verified vs needs manual studio check) and `gh pr create --base dev --body-file …`. Do NOT merge. Note that shipping the new sermons bundle to production is a separate `pnpm release sermons --minor` + dev→main when the team wants it live.
- [ ] **Step 4:** Report the PR URL + the verified/manual split.

---

## Execution notes

- Sequential within the shared tree. Chunk 1 (theme) underpins everything; Chunk 2 (sermons) needs the container-query plugin (Task 4) + dark tokens; Chunk 3 (studio) is mostly independent but the theme toggle needs Chunk 1.
- No production widget release here — the sermons bundle on `widgets.perimeter.org` only changes when the team runs `pnpm release sermons` + a dev→main release. This effort lands the fixes on `dev`.
- Dark mode is a CSS-variable swap activated by a host attribute — keep it that way (no per-component `dark:` classes; tokens do the work). The non-strict-schema assumption is load-bearing (Task 3 guards it).
- Out of scope: `prefers-color-scheme` auto dark, re-releasing sermons, the style.perimeter.org deploy.
