# Studio + Sermons UX (Round 3) — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the studio inspector (wide drawer, header tab bar, schema-driven fields with hints); fix the `@perimeter/ui` line-tab indicator alignment; and execute a broad UX/UI pass over the studio and sermons widget — all HIGH/MEDIUM audit fixes PLUS the opted-in nice-to-have features. (User chose "everything incl. new features" + "full inspector redesign".)

**Architecture:** Studio-side: rebuild `InspectorDrawer`/`Inspector` with an explicit header tab bar + much wider panel; make `ConfigPanel` schema-driven (checkbox/select/number/text from `describeSchemaFields`, extended with enum/min-max/description) with per-field hints; fix the shared `tabs.tsx` line-indicator measurement (offsetParent bug); a dark-mode tokenization sweep of pre-token components; a top-level error boundary; canvas-control disambiguation; overview/breadcrumb/nav polish; plus opted-in features (token copy, color picker, deep-link/standalone preview). Sermons-side: error/empty/loading states, search debounce, card/list hierarchy, results-toolbar overflow + a shared toolbar extract, player/media polish, modal focus trap, and opted-in features (share, view persistence, no-media affordance). Grounded in a read-only investigation + UX audit (file:line inline).

**Tech Stack:** React 19, Tailwind 3, zod 3.25, react-router, nuqs 2.8, vitest, Vite 6. **Test envs:** sermons / `@perimeter/ui` / example run **jsdom**; only `widget-runtime` uses happy-dom — write tests for the env the touched package actually uses. Neither jsdom nor happy-dom simulates real layout (rects are zero) or native Tab traversal, so indicator/width/focus-trap tests assert **structure + handler logic**, not rendered geometry. Builds on `dev` (rounds 1–2 merged). Visual outcomes can't be verified headlessly — each task does the machine-checkable part (render tests/build/grep) and records what needs the user's manual studio check (with the local perimeter-api running for sermons data).

---

## Context (root causes + audit, verified file:line)

**The three specific items:**
- **Inspector redesign:** the `@perimeter/ui` `Tabs` orientation handling fights the drawer layout (the round-2 local `flex w-full` didn't deliver a clean header row). Rebuild the drawer with an explicit header tab bar instead of relying on `Tabs` orientation. Drawer is `w-[30rem]` today (`InspectorDrawer.tsx`) — go wider.
- **Schema-driven fields + hints:** `ConfigPanel.tsx` renders EVERY field as a raw text input (so a boolean typed `true` becomes the string `"true"`). `studio/src/lib/schema-shape.ts` already has `describeSchemaFields` (extracts key/type/enum/default/optional) — extend it with number min/max (`ZodNumber._def.checks`) and `description` (`schema.description`). Widget schemas have **zero** `.describe()` today (`widgets/sermons/src/types.ts`, `widgets/example/src/widget.tsx`) — add concise descriptions so "what it affects" can be shown.
- **Tab indicator pushed right:** `tabs.tsx` `updateIndicator` positions an absolute indicator via `activeTab.offsetLeft + translateX(...)`, but `offsetLeft` is relative to the nearest positioned ancestor (offsetParent), which isn't guaranteed to be the `TabsList`. Fix: make the indicator's containing block the `TabsList` (ensure it's `position: relative`) and/or measure with `getBoundingClientRect` relative to the list. This is a genuine shared-component bug fix (affects all line-variant tabs) — acceptable to fix in `tabs.tsx`.

**Audit findings to implement (severity · file:line · fix):**

*Sermons — HIGH:* (a) no error state — `SermonsView.tsx:84`/`SeriesView.tsx:96` drop `error` from the query, so an API outage looks like "no results"; render a themed error block + retry. (b) search pushes history + queries per keystroke — `use-sermon-filters.ts:63,126` (`history:'push'`), `SermonFilters.tsx:154`; debounce (~300ms) + `history:'replace'`. (c) bare empty state — `SermonGrid.tsx:14`/`SeriesGrid.tsx:44` plain "No sermons found."; use `@perimeter/ui` `Empty` + clear-filters CTA when filters active.

*Sermons — MEDIUM:* card info mis-ordered (`MediaCard.tsx:100-113`); list-view four-slot run-together (`MediaCard.tsx:170-176`); filter-chip generic-label fallback (`SermonFilters.tsx:309`); result-count reflow on load (`SermonsView.tsx:162`); sort/view header overflow at narrow container widths (`SermonsView.tsx:160`); duplicated toolbar/pagination across `SermonsView`/`SeriesView` (~120 lines) → extract `ResultsToolbar`/`ResultsPagination`; PDF fit assumes US-Letter (`PdfViewer.tsx:122-139`); video controls auto-hide when paused (`VideoPlayer.tsx:32-36`); no keyboard seek on players; `ImagePlaceholder.tsx:8` hardcoded WP-logo URL; `Modal.tsx:42-46` not a real focus trap.

*Studio — HIGH:* `ConfigPanel` all-text inputs (the schema-aware fix above); untokenized colors/borders in pre-token components — `ConfigPanel` bare `rounded border`, `ComponentPreview.tsx:18` `text-amber-600` + `:47` `text-gray-500`/bare border (break in dark); no top-level error boundary (a throwing MDX doc/page white-screens the SPA — wrap `<Outlet/>` in `Layout`); the two "Dark" controls (canvas background vs widget theme) are confusingly co-named (`Canvas.tsx:101`).

*Studio — MEDIUM:* overview lists bare slugs (`OverviewPage.tsx:62-64`) — enrich with `widgetDoc` title/summary; no breadcrumbs; sidebar "No matches" dead end (`Sidebar.tsx:132`); embed snippet duplicated in Config + Info tabs (`Inspector.tsx:99,124`).

*Opted-in features (user chose "everything"):* sermons deep-link/share button on `SermonDetail`; sort+view-mode persistence (view is local `useState`, resets); "no media available" affordance (`MediaTabs.tsx:65`); studio click-to-copy token values (`TokensPage.tsx:27-42`); native color picker in `ThemeEditor.tsx:63`; standalone/fullscreen preview link + URL-encoded preview config (copy-deep-link).

Repo rules: pnpm only; branch `feat/studio-sermons-ux-3`; never commit to dev/main; conventional commits; `pnpm format` before `pnpm quality`; tests via `pnpm exec turbo run test --filter=<pkg> --force`; studio runtime bugs invisible to typecheck/build (happy-dom render tests; RTL cleanup not global); `docs/` `.prettierignore`'d; never touch `docs/superpowers/**`; PR bodies via Write tool + `--body-file`. **No production widget release here** — lands on `dev`. **Verification reality:** theming/layout/reflow/indicator-alignment are visual — do the machine-checkable part and record the manual studio check (sermons needs the local perimeter-api at `:5500`).

---

## Chunk 1: Inspector redesign + schema-driven fields

### Task 1: Branch + extend schema introspection + describe the schemas

**Files:** `studio/src/lib/schema-shape.ts`; `widgets/sermons/src/types.ts`; `widgets/example/src/widget.tsx`; tests

- [ ] **Step 1:** `git fetch --prune && git checkout -B feat/studio-sermons-ux-3 origin/dev`. Baseline: `pnpm install` then `pnpm exec turbo run test --filter=@perimeter/studio --filter=@perimeter/widget-sermons --force` green.
- [ ] **Step 2: Failing tests** (schema-shape): `describeSchemaFields` now returns, per field, `enumOptions: string[] | null` (from `ZodEnum.options`), `min`/`max: number | null` (from `ZodNumber._def.checks` kind `min`/`max`), and `description: string | null` (from the field's `.description`, captured before unwrapping). Assert against a fixture schema with an enum, a `z.coerce.number().min(0).max(20)`, a `.describe('…')`, and a boolean.
- [ ] **Step 3: Implement.** Extend `SchemaField` + `describeField` to capture `enumOptions` (`ZodEnum.options`), `min`/`max` (`ZodNumber._def.checks` entries `{kind:'min'|'max', value}`), and `description`. **Read `field.description` on the OUTERMOST wrapper FIRST, before peeling** — `ZodDefault`/`ZodOptional` do not reliably copy the description inward, so capture it up front (fall back to the inner type's `.description` if the outer has none). Keep existing fields. Then add concise `.describe()` to every field of the sermons schema (`types.ts`) and the example schema — one short sentence each ("what it affects"). (These descriptions also improve InfoPanel.)
- [ ] **Step 4:** Run the schema-shape + widget-sermons tests `--force` → green (sermons schema still parses; `.describe()` doesn't change validation). Commit: `feat(studio): richer schema introspection (enum/min-max/description) + describe widget schemas`.

### Task 2: Rebuild the inspector drawer (wide, header tab bar)

**Files:** `studio/src/components/InspectorDrawer.tsx`, `studio/src/components/Inspector.tsx`; tests

- [ ] **Step 1: Failing tests:** the drawer panel is substantially wider (assert the new width class, e.g. `w-[34rem]`/`w-[38rem]` with `max-w-[92vw]`); the inspector renders a **header tab bar** (Config/Theme/Info as a row of triggers at the very top of the panel, full width, evenly distributed), with the active panel below it (assert the tab bar precedes the panel and spans full width); the embed snippet appears **once** (not duplicated across Config + Info).
- [ ] **Step 2: Implement.** Widen `InspectorDrawer` (e.g. `w-[36rem] max-w-[92vw]`). Rebuild `Inspector` with an explicit header: a full-width segmented tab bar at the top (build it directly — a `role="tablist"` row of buttons with `aria-selected`, evenly distributed via `flex` + `flex-1`, active = clear token contrast — rather than fighting `@perimeter/ui` Tabs orientation), and below it the active panel (Config / Theme / Info) filling the width. Keep the panels (`ConfigPanel`/`ThemeEditor`/`InfoPanel`); drop the per-panel `Card` wrappers if they add nesting that cramps width — let the panel use the full drawer width with comfortable padding. Show the embed snippet once (e.g. a persistent footer or only under Config) — but **keep the exported `embedSnippet(slug)` function and its exact string intact** (`WidgetPage.test.tsx` asserts the snippet byte-for-byte; changing the string breaks that test). Keep `role="dialog"`/Escape/backdrop/focus-return from the existing drawer.
- [ ] **Step 3:** Run studio tests `--force` → green. Manual note: the inspector is a wide panel with a clean Config/Theme/Info header row on top and the fields below. Commit: `feat(studio): redesigned inspector drawer — wide panel + header tab bar`.

### Task 3: Schema-driven ConfigPanel with hints

**Files:** `studio/src/components/ConfigPanel.tsx`; tests

- [ ] **Step 1: Failing tests:** for a schema with a boolean, an enum, a `number().min().max()`, and a string field, `ConfigPanel` renders a **checkbox** for the boolean, a **select** (with the enum options) for the enum, a **number input** (with min/max) for the number, and a text input for the string — and emits the correctly-typed value on change (boolean `true`, not `"true"`; number, not string). Each field shows a **hint** line: its description (when present) and allowed values/range/default. All inputs use token classes (`border-border bg-bg text-fg`).
- [ ] **Step 2: Implement.** Drive the panel off the extended `describeSchemaFields`: render the right control per field type (checkbox / select / number / text), wiring `onChange` to emit the typed value into `overrides` (boolean/number/string as appropriate — the studio passes these to `mount()` which re-validates via the schema, so emit real types). Under each field, a small `text-muted-fg` hint: the description, then "Options: a | b | c" for enums, "Range: 0–20" for numbers, "Default: …", "Optional". Tokenize all inputs (fixes the dark-mode border issue). Keep the JSON-textarea fallback for non-object schemas but tokenize it too.
- [ ] **Step 3:** Run studio tests `--force` → green. Manual note: config fields are typed controls with hints, readable in dark. Commit: `feat(studio): schema-driven config inputs (checkbox/select/number) with per-field hints`.

---

## Chunk 2: Studio fixes & polish

### Task 4: Fix the `@perimeter/ui` line-tab indicator alignment

**Files:** `packages/ui/src/tabs.tsx`; tests

- [ ] **Step 1: RE-DIAGNOSE against the as-committed file — the obvious cause is already ruled out.** `tabs.tsx:124` ALREADY applies `relative` to the line-variant `TabsList`, and the indicator `<span>` is its direct child, so `offsetParent` IS the list — the "offsetParent bug" guess is likely WRONG. Read `updateIndicator` carefully and find the real cause; prime suspects: the `activeTab.offsetWidth * 0.2` / `* 0.6` width-fraction math (the underline is 60% width offset by 20%, which interacts badly with the trigger's `gap-1`/padding and can read as "pushed right"), and/or the `prevTransform` early-return (`:66`) skipping a needed re-measure. Record the actual mechanism before fixing. (jsdom/happy-dom return zero rects, so the test asserts structure/logic, not geometry.)
- [ ] **Step 2: Implement** the fix the diagnosis points to — most robustly, compute the indicator position/size rect-based relative to the list (`activeTab.getBoundingClientRect()` minus `list.getBoundingClientRect()`), sizing the underline to the trigger's content width (not an arbitrary 60%) so it sits directly under the active tab; ensure a tab-change triggers a re-measure (don't let `prevTransform` skip it). Keep the transition + `var(--color-fg)`.
- [ ] **Step 3:** Blast radius is exactly ONE consumer — `SermonTabs.tsx` is the sole `variant="line"` user (Inspector + `MediaTabs` use the default variant, no indicator). It renders inside the **shadow DOM** (rects work there at runtime) and uses the controlled `value`/`onValueChange` API, so the test must **drive a tab change** (not just initial render) and assert the indicator re-measure logic ran. Run ui + sermons + studio tests `--force` → green. Manual note (the definitive check): in the studio, the sermons/series tab underline sits directly below the selected tab. Commit: `fix(ui): line-tab indicator sits directly under the active tab`.

### Task 5: Dark-mode tokenization sweep + top-level error boundary

**Files:** `studio/src/components/ConfigPanel.tsx` (any leftover), `studio/src/components/ComponentPreview.tsx`, a new `studio/src/components/ErrorBoundary.tsx`, `studio/src/components/Layout.tsx`; tests

- [ ] **Step 1:** Grep the studio for untokenized colors/borders: `grep -rnE 'text-amber-|text-gray-|bg-gray-|text-black|bg-white|\brounded border\b|border(?![-:])' studio/src`. Fix each to tokens (`text-muted-fg`, a token warning color, `border-border`, `bg-bg`/`text-fg`) — notably `ComponentPreview.tsx:18,47` (amber/gray + bare border) and any ConfigPanel/Inspector leftovers — so the studio is fully theme-correct in dark.
- [ ] **Step 2:** Add a top-level React error boundary (`ErrorBoundary.tsx`) and wrap the routed `<Outlet/>` in `Layout.tsx`, so a throwing page/MDX doc shows a recover UI (message + "reload"/link home) instead of white-screening the SPA. Test it (a child that throws renders the fallback, not a crash).
- [ ] **Step 3:** Run studio tests `--force` → green. Commit: `fix(studio): tokenize pre-dark components + top-level error boundary`.

### Task 6: Canvas controls — disambiguate + de-densify

**Files:** `studio/src/components/Canvas.tsx`; tests

- [ ] **Step 1: Implement.** Disambiguate the two "Dark"s: rename the background-surface option so it's clearly the canvas surface (e.g. "Surface: Light/Gray/Dark/Host-sim" or label the group "Canvas surface"), distinct from the widget light/dark "Theme" toggle. De-densify the toolbar: group the clusters (Viewport · Theme · Surface · [DEV] Source) with clearer separation/labels so they don't read as one undifferentiated strip; allow wrapping. Keep all existing functionality + render-test hooks (`data-canvas-frame`/`data-canvas-surface`).
- [ ] **Step 2:** Update/extend Canvas tests for the renamed controls; run `--force` → green. Commit: `fix(studio): disambiguate canvas surface vs widget theme + de-densify toolbar`.

### Task 7: Overview cards + breadcrumbs + sidebar polish

**Files:** `studio/src/pages/OverviewPage.tsx`, a `Breadcrumbs` component + use in the page shells, `studio/src/components/Sidebar.tsx`; tests

- [ ] **Step 1: Implement.** Overview: enrich each widget/component card with its title/summary (use `widgetDoc`/the doc front-matter or a short derived label) instead of a bare slug. Breadcrumbs: a small `Home / <section> / <name>` trail on the Widget/Component/Guide pages (drive from the route params). Sidebar: give the "No matches" state a "clear search" affordance.
- [ ] **Step 2:** Render tests for the breadcrumb trail + enriched overview card; `--force` → green. Commit: `feat(studio): richer overview cards, breadcrumbs, sidebar clear-search`.

---

## Chunk 3: Studio opted-in features

### Task 8: Token copy + color picker

**Files:** `studio/src/pages/TokensPage.tsx`, `studio/src/components/ThemeEditor.tsx`; tests

- [ ] **Step 1: Implement.** TokensPage: make each token's CSS-var name and value **click-to-copy** (a button/affordance with copied feedback, reusing the embed-snippet copy pattern). ThemeEditor: pair each color token's text input with a native `<input type="color">` swatch that writes the same override (keep the text input for non-hex/`hsl()` values; sync both). 
- [ ] **Step 2:** Tests: clicking a token copy control calls clipboard with the value; the color input change calls `onChange` with the token. `--force` → green. Commit: `feat(studio): click-to-copy tokens + native color picker in the theme editor`.

### Task 9: Deep-linkable preview config + standalone preview

**Files:** `studio/src/pages/WidgetPage.tsx` (URL-encode the preview config/theme state), a "copy link" + "open standalone" control; possibly a minimal standalone preview route; tests

- [ ] **Step 1: Implement.** Encode the widget preview's config overrides + theme + viewport into the URL (query params via `useSearchParams`) so a tuned preview is shareable; add a "Copy link" control. Add an "Open preview standalone" affordance — a route (e.g. `/preview/:slug`) that renders just the `WidgetPreview` (full-bleed, reading the same query params), useful for sharing/inspection. Keep it within the SPA (no new Vercel config).
- [ ] **Step 2:** Tests: changing config updates the URL; loading a URL with params hydrates the preview; the standalone route renders the preview alone. `--force` → green. Commit: `feat(studio): shareable preview links + standalone preview route`.

---

## Chunk 4: Sermons — states, search, layout

### Task 10: Error / empty / loading states

**Files:** `widgets/sermons/src/components/sermons/SermonsView.tsx`, `series/SeriesView.tsx`, `SermonDetail.tsx`; the grids/lists; tests

- [ ] **Step 1: Implement.** Pull `error` from the `useSermons`/`useSeries` queries and render a themed error block (mirror the `@perimeter/ui` `Empty` pattern) with a retry (refetch) action — distinct from the empty state — in both views and the SermonDetail "related" fetch (quiet inline note there). Replace the bare "No sermons found." (`SermonGrid`/`SeriesGrid`/lists) with `Empty`/`EmptyHeader`/`EmptyDescription` + an icon, and a "Clear filters" CTA when filters are active. Reserve the result-count space while loading so the toolbar doesn't reflow.
- [ ] **Step 2:** Build + sermons tests `--force` → green; gz < 900 KiB. Manual note (needs local API): an API failure shows the error block; no-results shows the themed empty + clear-filters. Commit: `fix(sermons): themed error + empty + stable loading states`.

### Task 11: Search debounce + history

**Files:** `widgets/sermons/src/hooks/use-sermon-filters.ts` (NOTE: `hooks/`, not `lib/`; `history:'push'` is at ~line 64, `setSearch` ~126), `SermonFilters.tsx`, `SeriesView.tsx`; tests

- [ ] **Step 1: Implement using nuqs's NATIVE debounce.** nuqs 2.8 exposes a built-in `debounce(ms)` helper + per-setter `Options` (`limitUrlUpdates`, `history`). The cleanest fix: on the search setter, pass `{ history: 'replace', limitUrlUpdates: debounce(300) }` — this solves BOTH the per-keystroke query AND the back-button history spam in one call, no local-state-then-debounce machinery. (The hook sets `history:'push'` globally at line ~64 for all params, so the per-setter `history:'replace'` override on search is required regardless.) Keep the input responsive. Add an inline clear-search (×) affordance in the search field (today only a removable search *chip* exists, not an in-field ×).
- [ ] **Step 2:** Test with fake timers: rapid keystrokes settle to one update; the clear (×) resets search. `--force` → green. Commit: `fix(sermons): debounced search (nuqs debounce + replace history) + in-field clear`.

### Task 12: Card/list hierarchy + filter chips + toolbar overflow + shared extract

**Files:** `MediaCard.tsx`, `SermonFilters.tsx`, `SermonsView.tsx`, `SeriesView.tsx`, a new shared `ResultsToolbar`/`ResultsPagination`; tests

- [ ] **Step 1: Implement.** Fix grid card info ordering (`MediaCard.tsx:100-113`): title first, then a meta row (date · speaker), then the series pill — coherent scan order. Fix compact list mode (`:170-176`): separators (·) or trim to title + date·speaker so the four slots don't run together. Filter chips: seed the label cache from the selected-detail responses (the `useFilterLabelCache` exposes `absorb` for this) so a pinned/deep-linked filter never shows the generic "Series"/"Speaker" fallback (`SermonFilters.tsx:309`). Make the results header (sort/view + count) wrap / collapse labels at narrow container widths (container-query aware, like the grid). **Extract scope — keep it tight:** the two views' search/filter rows DIVERGE (SermonsView delegates search to `SermonFilters`; SeriesView has a bespoke inline search/date row) and their pagination keys off different sources (`pagination.page` vs `filters.page`) — so extract ONLY the genuinely-shared pieces: `ResultsToolbar` (count + sort + view) and `ResultsPagination` (the pager, with the page source passed in as a prop). Do NOT fold the search/filter rows into the shared components.
- [ ] **Step 2:** Build + tests `--force` → green; gz < 900 KiB. Manual note: cards read cleanly, list mode is legible, header doesn't overflow on mobile presets. Commit: `fix(sermons): card/list hierarchy, chip labels, responsive results toolbar (shared)`.

---

## Chunk 5: Sermons — media/players + opted-in features

### Task 13: Player + media + modal polish

**Files:** `VideoPlayer.tsx`, `AudioPlayer.tsx`, `PdfViewer.tsx`, `Modal.tsx`, `ImagePlaceholder.tsx`; tests

- [ ] **Step 1: Implement.** Video: controls currently auto-hide on a **3s timer + on mouse-leave** (`VideoPlayer.tsx:32-36,101`) with NO `isPlaying` dependency — gate the hide so controls stay visible while **paused** (and on hover); don't hunt for a non-existent `!isPlaying` branch. Players: add keyboard support — the container needs to be made **focusable** (`tabIndex`) first (none today), then keydown handlers (space = play/pause, ←/→ = seek). PDF: `fitWidth`/`fitPage` (`PdfViewer.tsx:122-139`) currently use US-Letter constants (612×792) with no page proxy in scope — capture the loaded page's REAL dimensions via `<Page onLoadSuccess={(page) => …}>` (react-pdf 10 / pdfjs 5 expose the viewport) and derive scale from them. Modal: make it a real focus trap — `Modal.tsx:42-46` only does `panelRef.focus()`, no Tab loop; add a keydown loop (Tab on last focusable → first, Shift+Tab on first → last). It renders inline in the shadow DOM (not a portal). ImagePlaceholder: replace the hardcoded WP-logo URL (`:8`) with an inline token-driven SVG mark that themes for dark.
- [ ] **Step 2:** Build + tests `--force` → green; gz < 900 KiB (record the measured KB — headroom is ~4%; the focus trap is hand-rolled, no `tabbable`/`focus-trap` dep). Note: the focus-trap test asserts the keydown LOOP logic (last→first / first→last), not native Tab traversal (jsdom doesn't simulate it). Manual note (needs media): paused controls stay, keyboard works, PDF fits non-Letter pages, modal traps focus, placeholder themes. Commit: `fix(sermons): player keyboard + paused controls, real PDF fit, modal focus trap, themed placeholder`.

### Task 14: Sermons opted-in features

**Files:** `SermonDetail.tsx` (share), the view-mode state (persistence), `MediaTabs.tsx` (no-media); tests

- [ ] **Step 1: Implement.** Share/deep-link: a "Copy link" / share control on `SermonDetail` (the nuqs URL state already encodes the selected sermon — copy `location.href`). View-mode persistence: persist `viewMode` (grid/list/large) to the URL (or localStorage) so it survives reload/tab switch, like sort already does. No-media affordance: when a sermon has zero media links, show a small "No media available yet" note instead of `MediaTabs` returning `null` (`MediaTabs.tsx:65`).
- [ ] **Step 2:** Build + tests `--force` → green; gz < 900 KiB. Commit: `feat(sermons): share link, persistent view mode, no-media affordance`.

---

## Chunk 6: Finalize

### Task 15: Gate + PR

- [ ] **Step 1: Full gate.** `pnpm format`, `pnpm quality`, `pnpm exec turbo run test --filter=@perimeter/studio --filter=@perimeter/ui --filter=@perimeter/widget-sermons --filter=@perimeter/theme --force`, `pnpm --filter @perimeter/studio build`. All green; sermons gz < 900 KiB; prod studio build no dev-only leakage; `tabs.tsx` change is the intended indicator fix only.
- [ ] **Step 2: PR.** Push `feat/studio-sermons-ux-3`; PR body via the Write tool — the inspector redesign, the tab-indicator fix, and the full audit pass (grouped studio/sermons, with the opted-in features called out), plus a clear **machine-verified vs needs-manual-studio-check** split (all the visual/layout/reflow/indicator/theming outcomes need the live studio + local perimeter-api), and that shipping the new sermons bundle is a separate `pnpm release sermons --minor` (new features → minor → 1.2.0) + dev→main. `gh pr create --base dev --body-file …`. Do NOT merge.
- [ ] **Step 3:** Report the PR URL + the verified/manual split.

---

## Execution notes

- Sequential within the shared tree. Chunk 1 (inspector + schema) and Task 4 (tab indicator) are independent of the sermons chunks; order as written.
- This is a large batch (15 tasks). If a task balloons, split it rather than overstuffing a commit. Each task ends green + committed so the run can pause/resume cleanly.
- Many outcomes are visual (inspector layout, tab indicator, dark theming, card/list hierarchy, grid/toolbar reflow, players, modal) — record machine-verified vs manual studio check honestly per task; the final PR collects the split.
- Shipping to production is a separate `pnpm release sermons --minor` + `dev → main` (these add features → 1.2.0) when the team wants it live.
- The `tabs.tsx` indicator fix is a legitimate shared bug fix (not a styling-preference change) — but still verify no line-tab consumer regresses.
