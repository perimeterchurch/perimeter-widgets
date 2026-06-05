# Studio + Sermons Fixes (Round 2) — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix nine reported studio + sermons issues: studio chrome light/dark mode (default dark); inspector drawer width + a proper top tab row; built-widget preview errors; sermons filter layout; sermons/series tab selected-state; sort/view dropdown responsiveness + theming; sermons responsive reflow in the studio; and full theme toggling.

**Architecture:** Mostly local fixes grounded in a read-only root-cause pass (file:line below). The two structural ones: (1) the studio chrome gets a `:root` + `:root[data-theme="dark"]` token layer (from the existing `darkTokens`) plus a default-dark theme toggle on `document.documentElement`; (2) `@perimeter/ui` `Tabs` gains correct full-width horizontal layout so the inspector tabs form a top row. The sermons fixes are CSS/token/layout corrections in its own components. Theming + selected-state + responsive fixes have weak headless verification (they're visual), so each carries a deterministic machine check where possible and is explicitly flagged for the user's manual studio confirmation.

**Tech Stack:** React 19, Tailwind 3 (+ container-queries plugin, already added), `@perimeter/theme` (`darkTokens` already exists), `@perimeter/ui`, vitest/happy-dom, Vite 6. Follows the read-only investigation in this session (root causes inline). Builds on `dev` (the round-1 dark-mode/responsive work is merged).

---

## Context for a zero-context engineer (root causes, verified file:line)

**Studio:**
- **Drawer too narrow:** `studio/src/components/InspectorDrawer.tsx:84` panel is `w-[22rem]` (352px); `ConfigPanel.tsx:38` uses `grid grid-cols-2` (label|input 1:1) and `ThemeEditor.tsx:51` `grid-cols-[1fr_minmax(0,9rem)]` — long token labels squeeze the inputs at 352px.
- **Tabs not a clean top row:** `Inspector.tsx:77-78` renders `@perimeter/ui` `Tabs` with `TabsList className="w-full"`, but `tabs.tsx:20` TabsList is `inline-flex w-fit` and does NOT become `flex w-full` in horizontal orientation — so the triggers pack tight/left instead of a full-width row.
- **Built-widget errors:** `BuiltBundlePreview.tsx` builds an iframe `srcDoc` with `<script src="${url}">` where `url` comes from `built-bundles.ts` `import.meta.glob('.../dist/index.js', {query:'?url',eager:true})`. No load/error handling; if `dist` is stale/dev-built (jsxDEV under prod NODE_ENV) or the `?url` 404s, the iframe fails silently/throws. The studio also points source previews at `localhost:5500` (WidgetPreview), but the built iframe has no API base — it uses whatever's baked in.
- **Studio chrome is light-only:** `studio/src/lib/light-dom-tokens.ts` `rootTokenCss()` emits only `:root { …globalTokens }`; `main.tsx` injects it once. `darkTokens` exists in `@perimeter/theme` but is unused by the chrome; there's no toggle.

**Sermons** (`widgets/sermons/src`; only `@perimeter/ui` inline components, NO Base UI Combobox/portal — confirmed):
- **Filters spread unevenly:** `SermonFilters.tsx:168` filter row is `flex items-center gap-2` with each `MultiCombobox` `flex-1` (equal spread → big gaps); the search `InputGroup` (row 1) lacks `flex-1`/`w-full` so it doesn't fill.
- **Tab selected-state invisible:** `SermonTabs.tsx` uses `@perimeter/ui` `Tabs` default variant; active = `data-active:bg-bg data-active:text-fg` (`tabs.tsx:140`) — `bg-bg` barely contrasts the list background, so the selected tab doesn't read as selected.
- **Sort/View dropdowns:** `SortSelect.tsx:60` / `IconSelect.tsx:51` render an inline `absolute right-0 w-48/w-44 bg-bg … ring-fg/10` popup (inside the shadow root — they DO get `:host` vars, so portal is NOT the issue). Symptoms: fixed width + `right-0` can clip on narrow widths (not responsive), and the popup/option styling needs to read correctly in dark (verify contrast; add token-correct hover/selected, no hardcoded colors).
- **Responsive doesn't visibly reflow in the studio:** `App.tsx:101` root `@container p-4`; grids `@sm:/@lg:grid-cols-*`. The container CSS IS built. Likely causes: the default container breakpoints (24/28/32rem) + the host-sim `HostFrame` 90px side padding (`HostFrame.tsx`) leave little usable width, so 375/768/1280 don't map to distinct 1/2/3-col stages; and the reflow must be verified to actually track the canvas frame width through the shadow host. Needs explicit, sensible breakpoints + verification the widget root width follows the canvas frame.
- **Doesn't fully toggle theme:** beyond the above, audit for elements that escape the `data-theme` swap — `styles.css` react-pdf `@import`s (AnnotationLayer/TextLayer light CSS), any remaining hardcoded colors, the intentional always-dark VideoPlayer overlay (leave it). Nothing portals out of the shadow root in sermons (confirmed), so the swap reaches everything inside.

Repo rules: pnpm only; never commit to `dev`/`main` (branch `feat/studio-sermons-fixes-2`); conventional commits; `pnpm format` before `pnpm quality`; tests via `pnpm exec turbo run test --filter=<pkg> --force`; studio runtime bugs are invisible to typecheck/build (happy-dom render tests; RTL cleanup not global — scope queries / `afterEach(cleanup)`); `docs/` is `.prettierignore`'d (studio build validates MDX); never touch `docs/superpowers/**`. PR bodies via the Write tool + `--body-file`.

**Verification reality:** theming-renders-correctly, selected-state-is-visible, dropdown-positioning, and grid-reflow are visual and need the live studio (+ local perimeter-api for data). Each task does the machine-verifiable part (render tests asserting classes/attributes/structure; build; grep) and records what's left for the user's manual studio check. Never claim a visual result you didn't observe.

---

## Chunk 1: Studio chrome — dark mode, drawer, tabs, built-preview

### Task 1: Branch + studio light/dark mode (default dark)

**Files:** `studio/src/lib/light-dom-tokens.ts`; `studio/src/lib/use-studio-theme.ts` (new); `studio/src/main.tsx`; a toggle in `studio/src/components/Sidebar.tsx` or `Layout.tsx`; tests

- [ ] **Step 1:** `git fetch --prune && git checkout -B feat/studio-sermons-fixes-2 origin/dev`. Baseline: `pnpm install` then `pnpm exec turbo run test --filter=@perimeter/studio --force` green.
- [ ] **Step 2: Failing tests:** `rootTokenCss()` emits both a `:root { … globalTokens }` block and a `:root[data-theme="dark"] { … darkTokens }` block (assert both selectors + a known dark value). A `useStudioTheme` hook defaults to `'dark'`, persists to localStorage, and applies `document.documentElement.setAttribute('data-theme', …)`.
- [ ] **Step 2b: Prerequisite — export `darkTokens`.** `darkTokens` exists in `packages/theme/src/tokens.ts` but is NOT re-exported from `packages/theme/src/index.ts` (the package's only public entry — there's no `./tokens` subpath). Add `darkTokens` to the `index.ts` re-export first, or `import { darkTokens } from '@perimeter/theme'` won't resolve.
- [ ] **Step 3: Implement.** `light-dom-tokens.ts`: import `darkTokens` (now exported), emit `:root {light}` + `:root[data-theme="dark"] {dark}` (keep `installRootTokens` injecting both). `use-studio-theme.ts`: `useStudioTheme()` → `{ theme, setTheme, toggle }`, default `'dark'` (read localStorage `studio-theme` if present), effect sets `documentElement` `data-theme` + persists. In `main.tsx`, set the initial `data-theme` before render (avoid a light flash) — read localStorage or default `'dark'`. Add a compact light/dark toggle to the shell (Sidebar header or Layout) using the hook + an `@perimeter/ui` `Button` with a sun/moon (lucide) icon.
- [ ] **Step 4:** Run `pnpm exec turbo run test --filter=@perimeter/studio --force` → green. Build the studio; confirm the chrome defaults to dark (machine: `data-theme="dark"` on `documentElement` initial; manual: looks dark). Note this themes the CHROME only — the widget preview keeps its own independent canvas light/dark toggle.
- [ ] **Step 5:** Commit: `feat(studio): light/dark chrome theme, default dark`.

### Task 2: Inspector tab row — clean full-width row at the top (LOCAL fix, no global Tabs change)

**Files:** `studio/src/components/Inspector.tsx` (and `InspectorDrawer.tsx` layout if needed); test. **Do NOT edit `packages/ui/src/tabs.tsx`** — making horizontal `TabsList` globally `flex w-full` would stretch the sermons `SermonTabs` + `MediaTabs` rows (they intentionally size to content), a visible regression. Scope this to the Inspector only.

- [ ] **Step 1: Confirm the actual symptom first.** `Inspector.tsx:78` already passes `TabsList className="w-full"`. Read the rendered structure: is the tab row already a full-width row at the top with content below, or do the triggers pack tight/left (because `inline-flex` ignores `w-full` for distribution) or wrap oddly in the narrow drawer? Record what's actually wrong (the user reports the categories aren't a clean top row). The fix is whatever makes a clean top row — likely adding `flex` to the Inspector's TabsList className (so `flex w-full` distributes the `flex-1` triggers) and/or ensuring the `Tabs` root stacks the list above the content (column). Keep all changes in `Inspector.tsx`.
- [ ] **Step 2: Failing test:** a studio render test asserting the Inspector renders Config/Theme/Info as a single full-width row of triggers at the top, with the active panel below (e.g. the TabsList has `flex`+`w-full` classes and precedes the TabsContent). 
- [ ] **Step 3: Implement** the local Inspector fix (TabsList `className="flex w-full"` plus whatever ordering/orientation is needed). Run studio tests `--force` → green. (Sermons `SermonTabs` is handled independently in Task 6 and is unaffected by this local change.)
- [ ] **Step 4:** Commit: `fix(studio): inspector category tabs as a clean full-width top row`.

### Task 3: Inspector drawer width + field layout

**Files:** `studio/src/components/InspectorDrawer.tsx`, `studio/src/components/ConfigPanel.tsx`, `studio/src/components/ThemeEditor.tsx`; test

- [ ] **Step 1: Failing/structural test:** the drawer panel is wider than 22rem (assert the new width class), and ConfigPanel/ThemeEditor field rows use an auto-label / flexible-input grid (assert the grid-template class). (Class-assertion is acceptable here since the visual fit needs the studio.)
- [ ] **Step 2: Implement.** `InspectorDrawer.tsx:84`: widen to `w-[30rem]` (keep `max-w-[90vw]`). `ConfigPanel.tsx:38`: `grid grid-cols-2` → `grid grid-cols-[minmax(6rem,auto)_1fr] items-center gap-2` (label auto, input fills). `ThemeEditor.tsx:51`: → the same `grid-cols-[minmax(6rem,auto)_1fr]` (drop the 9rem clamp) so token inputs get room. Confirm the Inspector tab row (Task 2) now spans the wider drawer.
- [ ] **Step 3:** Run studio tests `--force` → green. Manual note: config/theme fields fit comfortably; tabs are a full-width top row. Commit: `fix(studio): wider inspector drawer + roomier field layout`.

### Task 4: Built-widget preview errors

**Files:** `studio/src/components/BuiltBundlePreview.tsx` (+ `built-bundles.ts` if needed); test

- [ ] **Step 1: Reproduce + root-cause.** Build a widget (`pnpm --filter ./widgets/example build`), read the resolved `?url` and the `srcDoc`. Determine the actual failure: (a) the `?url` path not loading in the iframe, (b) a stale/dev (`jsxDEV`) `dist` crashing under the prod `NODE_ENV` define, and/or (c) the bundle's API base. Record the concrete error(s). (If the live error can't be reproduced headlessly, harden all three + surface errors — see Step 2.)
- [ ] **Step 2: Implement.** Make the iframe robust and self-reporting: in the `srcDoc`, wrap the bundle load in `window.onerror`/`try`-`catch` that `postMessage`s the error to the parent; `BuiltBundlePreview` listens and renders a clear in-frame error (not a silent/blank failure). Ensure the "build the widget first" path still covers a missing `dist`. If the `?url`/path is the cause, fix the URL resolution; if dev-build poisoning is plausible, document that the Built view requires `pnpm build` (not a `pnpm dev` watch build) and detect a dev bundle if cheaply possible (e.g. grep the fetched text for `jsxDEV` and warn). Keep the whole feature `import.meta.env.DEV`-gated (it already is) so nothing changes in the deployed gallery.
- [ ] **Step 3: Test:** render `BuiltBundlePreview` (mock `builtBundleUrl`) and assert it renders an iframe for a known slug and a graceful error/hint (not a throw) when the bundle is missing or errors. Run studio tests `--force` → green.
- [ ] **Step 4:** Commit: `fix(studio): built-widget preview surfaces load errors instead of failing silently`. Record machine-verified vs the manual "toggle to Built in the running studio" check.

---

## Chunk 2: Sermons — filters, tabs, dropdowns, full theme

### Task 5: Filter row layout

**Files:** `widgets/sermons/src/components/sermons/SermonFilters.tsx`; test if practical

- [ ] **Step 1: Implement.** Make the search fill its row: the `InputGroup` (row 1, ~line 148) gets `w-full` (or its wrapper `flex-1`). Fix the filter row (line 168): the dropdowns should take intrinsic width and sit together, not spread with `flex-1` gaps — remove `flex-1` from each `MultiCombobox` (lines ~177/191/207/221/235) and let the row be `flex flex-wrap items-center gap-2` (so they pack left and wrap on narrow widths), OR use a grid that wraps. Confirm the search bar fills and the dropdowns no longer have large equal gaps.
- [ ] **Step 2:** `pnpm --filter ./widgets/sermons build` succeeds; `pnpm exec turbo run test --filter=@perimeter/widget-sermons --force` green; gz < 900 KiB. Manual note: filters look tight + search fills. Commit: `fix(sermons): filter row layout — search fills, dropdowns pack without gaps`.

### Task 6: Sermons/Series tab selected-state

**Files:** `widgets/sermons/src/components/SermonTabs.tsx` (and/or `packages/ui/src/tabs.tsx` active style)

- [ ] **Step 1: Implement (prefer a per-instance fix — avoid the global blast radius).** Make the selected tab unmistakable in BOTH light and dark. **Preferred:** set `variant="line"` on the `SermonTabs` `TabsList` (a per-instance prop → clear underline indicator, no global change) — verify the line indicator actually renders/measures in the shadow root. If `variant="line"` doesn't read clearly, add a strong active state to the `SermonTabs` instance via `className` on its triggers (e.g. `data-active:bg-muted data-active:text-fg data-active:shadow-sm`) rather than editing `tabs.tsx`'s shared default (which would also restyle the inspector tabs). Verify the active state is visible in dark too.
- [ ] **Step 2: Test:** a render test asserting the active trigger carries the selected styling/`data-active` and a distinct class from inactive. Run `--force` → green. Manual note: the selected sermons/series tab is obvious. Commit: `fix(sermons): visible selected state on the sermons/series tabs`.

### Task 7: Sort/View dropdowns — responsive + theme-correct

**Files:** `packages/ui/src/sort-select.tsx`, `packages/ui/src/icon-select.tsx`; tests

- [ ] **Step 1: Implement.** The substantive fix is **responsiveness/clipping** — these popups are ALREADY fully token-based (`bg-bg`/`text-fg`/`ring-fg/10`/`hover:bg-accent`/`text-muted-fg`, no `gray-`/hex — confirmed), so they theme correctly inside the shadow root; do NOT invent a token cleanup that isn't needed. Fix: the popup `absolute right-0 w-48`/`w-44` can clip on narrow widths — keep `right-0` but cap width to the available space (`w-[min(12rem,calc(100%-0.5rem))]`-style or a container-relative max) and ensure the trigger button doesn't overflow its row on mobile (truncate label, `shrink-0` icon). While here, sanity-check the option rows' hover/selected read with adequate contrast in dark (they use tokens, so they should — confirm, don't churn).
- [ ] **Step 2: Test:** render SortSelect + IconSelect open; assert the popup has the width-cap class (the real fix) and renders option rows with token classes. Run `--force` → green. Manual note: dropdowns don't clip on narrow widths and read correctly in dark. Commit: `fix(ui): sort/view dropdowns cap width so they don't clip on narrow widths`.

### Task 8: Full theme-toggle audit

**Files:** `widgets/sermons/src/styles.css`, any remaining hardcoded-color components found by grep

- [ ] **Step 1: Enumerate.** `grep -rnE 'stone-|gray-|slate-|zinc-|neutral-|\[#|#[0-9a-fA-F]{3,6}' widgets/sermons/src` → anything still hardcoded (excluding the recorded intentional VideoPlayer overlay). Also inspect `styles.css` react-pdf `@import`s — those layer CSS files carry light colors; if the PDF/text layer shows light-on-dark in dark mode, add token-based overrides (scoped to the widget) for the affected react-pdf classes.
- [ ] **Step 2: Implement.** Tokenize any remaining hardcoded colors; add dark-correct overrides for the react-pdf annotation/text-layer classes if they don't theme (or accept + document if they're on a media surface). Confirm nothing in sermons portals outside the shadow root (already confirmed — so the `data-theme` swap reaches everything inside).
- [ ] **Step 3:** Build + `--force` tests green; gz < 900 KiB; `grep` shows only intentional literals. Manual note: toggling dark themes the whole widget incl. dropdowns/tabs/filters. Commit: `fix(sermons): remaining elements follow the theme (full dark toggle)`.

---

## Chunk 3: Responsive + finalize

### Task 9: Sermons responsive reflow in the studio

**Files:** `widgets/sermons/src/App.tsx`, `components/sermons/SermonGrid.tsx`, `components/series/SeriesGrid.tsx`, **and the skeleton grids `components/sermons/SermonsView.tsx:185` + `components/series/SeriesView.tsx:194`** (so loading state reflows identically); possibly `widgets/sermons/tailwind.config.ts` (named container breakpoints); maybe `studio/src/components/Canvas.tsx`/`HostFrame.tsx` if the width doesn't propagate

- [ ] **Step 1: Diagnose the width chain.** Confirm whether the widget root `@container` width actually tracks the canvas frame width: the canvas frame (`data-canvas-frame`, inline `width`) → shadow host (`[data-perimeter-widget-preview]`, a block div, fills the frame) → widget root (`@container`, fills the host). If host-sim is active, `HostFrame`'s 90px side padding shrinks usable width — note that. Determine why 375/768/1280 don't produce visibly distinct 1/2/3-col stages: most likely the default container breakpoints (`@sm` 24rem / `@lg` 32rem) don't align with these widths (esp. minus padding).
- [ ] **Step 2: Implement.** Set explicit, sensible container breakpoints so the grid clearly reflows: 1 col by default, 2 cols at a small container width, 3 at a larger one. **CRITICAL — correct arbitrary container-query syntax:** the `@tailwindcss/container-queries` plugin (v0.1.1) uses `@[<size>]:` — i.e. **`@[30rem]:grid-cols-2 @[48rem]:grid-cols-3`** (NOT `@min-[30rem]:`, which the plugin does NOT recognize and emits ZERO CSS — verified). Alternatively configure named container breakpoints in the tailwind config (`theme.containers`) and use `@<name>:`. Apply the SAME variants to `SermonGrid`, `SeriesGrid`, and both skeleton grids (SermonsView/SeriesView) consistently. If Step 1 finds the width does NOT propagate to the widget root (an ancestor forces full width), fix that (host/root `width:100%` of the frame, not `min-width` pinned). Keep it container-relative (correct for real embeds), not viewport. Note the host-sim `HostFrame` eats 180px of side padding (`hostProfile.contentPaddingX` ×2) — at the 375px Mobile preset the widget container is ~195px, so pick a 2-col breakpoint at/under ~12rem if you want Mobile to ever show 2 cols, or accept Mobile = 1 col (sensible).
- [ ] **Step 3: Verify.** Build; grep the bundle: `container-type` present AND the new variant rules emit `@container (min-width: …)` (grep for the rem values, e.g. `30rem`/`48rem`, inside `@container` rules — if the grep finds NO `@container (min-width` rules for your breakpoints, you used the wrong variant syntax and it silently emitted nothing). Add a render test if practical asserting the grid elements carry the new `@[…]:grid-cols-*` classes (happy-dom won't do real CQ layout — limited to class presence). **This is the issue with the weakest headless verification** — record clearly that the definitive check is manual: in the studio at Mobile/Tablet/Desktop presets the sermon grid shows 1/2/3 columns. Commit: `fix(sermons): grid reflows by container width with explicit @[…] breakpoints`.

### Task 10: Finalize — gate, PR

- [ ] **Step 1: Full gate.** `pnpm format`, `pnpm quality`, `pnpm exec turbo run test --filter=@perimeter/studio --filter=@perimeter/ui --filter=@perimeter/widget-sermons --filter=@perimeter/theme --force`. All green; sermons gz < 900 KiB; studio build succeeds; prod studio build still has no dev-only leakage.
- [ ] **Step 2: PR.** Push `feat/studio-sermons-fixes-2`; PR body via the Write tool — the nine fixes, what's machine-verified vs needs-manual-studio-check (theming/selected-state/dropdown-positioning/grid-reflow + built-widget toggle, all needing the live studio + local perimeter-api), and that shipping the new sermons bundle is a separate `pnpm release sermons` + dev→main. `gh pr create --base dev --body-file …`. Do NOT merge.
- [ ] **Step 3:** Report the PR URL + the verified/manual split.

---

## Execution notes

- Sequential within the shared tree. Task 2 (`@perimeter/ui` Tabs) underpins Task 3's inspector row and is reused by sermons Task 6 — do it before both.
- Several fixes are visual and can't be fully verified headlessly (theming, selected-state, dropdown positioning, grid reflow, the Built toggle). Each task does the machine-verifiable part and records the manual studio check; the final PR collects the verified-vs-manual split so the user knows exactly what to eyeball.
- No production widget release here — lands on `dev`. Shipping the new sermons bundle = a separate `pnpm release sermons --patch` (these are fixes, so patch → 1.1.1) + dev→main when the team wants it live.
- Out of scope: re-releasing sermons, the style.perimeter.org deploy, a Base UI Combobox shadow-portal container (sermons doesn't use Combobox — defer that until a widget needs it).
