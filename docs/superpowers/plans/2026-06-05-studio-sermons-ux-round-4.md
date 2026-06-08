# Studio + Sermons UX (Round 4) — Systemic Theming Fix, Visual Verification & Full Audit Pass

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Fix the systemic dark-mode root cause (Tailwind `darkMode` decoupled from `data-theme`), stand up a **real Playwright visual-verification harness** for the studio so visual fixes are confirmed not just asserted, and execute the full audit pass: the three specific items (config-tab alignment, dropdown dark text, sermons tabs → segmented control), all high/medium audit findings (theming, a11y, loading states), the de-bloat (delete dead code, split the 761-line date picker, prune redundant `dark:`), and the studio UX/DX improvements.

**Why this round is different:** rounds 1–3 fixed visual bugs that kept recurring because (a) a single systemic config gap decoupled every `dark:` class from the real theme, and (b) nothing was ever visually verified (headless tests assert structure, not rendered color/position). This round fixes the root cause AND adds a Playwright gate that launches the studio, mocks the sermons API, toggles dark, and checks computed styles + screenshots.

**Tech Stack:** React 19, Tailwind 3, `@playwright/test` (already a dep in `packages/parity`), zod, react-router, nuqs, vitest. Test envs: sermons/`@perimeter/ui`/example/studio run jsdom or happy-dom (per-file) — **neither renders real layout/color/`prefers-color-scheme`**, which is why the Playwright harness exists. Grounded in this session's read-through + the deep audit (file:line inline). Builds on `dev` (rounds 1–3 merged).

---

## Context — root causes (verified file:line)

**THE SYSTEMIC ONE — `darkMode` is unconfigured (HIGH, the reason dark mode "isn't perfect"):** no `darkMode` setting in `packages/theme/src/tailwind.ts` → Tailwind v3 defaults to `'media'`, so EVERY `dark:` utility compiles to `@media (prefers-color-scheme: dark)` and fires on the visitor's OS, NOT the widget's `data-theme`. The base token swap works (colors are CSS vars on `:host([data-theme=dark])` / `:root[data-theme=dark]`), so it's not catastrophic, but all `dark:`-specific tweaks are wrong. **The fix is subtle:** widgets theme in the **shadow DOM** (`:host([data-theme=dark])` — the host is OUTSIDE the shadow tree, so a Tailwind `[data-theme=dark] &` descendant selector can NOT reach it), while the studio chrome themes in the **light DOM** (`:root[data-theme=dark] …`). A single shared preset variant must cover both — a custom variant with multiple selectors, e.g. `addVariant('dark', [':host([data-theme="dark"]) &', ':where([data-theme="dark"]) &'])` (the first matches inside a widget shadow root; the second matches light-DOM descendants in the studio). This needs a spike + visual confirmation in BOTH contexts. `dark:` sites that will start behaving correctly: `packages/ui/src/{badge,tabs,input-group,combobox,textarea}.tsx`, `widgets/sermons/src/components/SermonTabs.tsx`, `studio/src/components/Inspector.tsx`.

**The three specific items:**
1. **Config-tab alignment:** the schema-driven `ConfigPanel` (`studio/src/components/ConfigPanel.tsx`) renders checkbox/select/number/text controls with inconsistent widths/heights → they don't align. Give every field row a consistent grid (label column + control column filling the rest), controls a uniform height, checkboxes aligned in the control column (not floating).
2. **Sort/View dropdown dark text (CONFIRMED root cause):** `sort-select.tsx:60` and `icon-select.tsx:51` popup `<div>`s are `bg-bg` with **no `text-fg`**; option `<button>` text sets no color → inherits the ancestor/host color → dark-on-dark in dark mode. Fix: add `text-fg` to both popup containers (combobox/multi-combobox already do this — these two are the only ones missing it). One-class fix per file, but VERIFY via the harness.
3. **Sermons/series tabs → the inspector's segmented control:** the `@perimeter/ui` line-variant indicator is still visually broken; the inspector (`Inspector.tsx:93-122`) uses a clean **segmented control** (rounded `bg-muted` track, active = `bg-bg text-fg shadow-sm`, `role="tablist"`, `aria-selected`, roving tabindex — but NO arrow-key handler). Extract that segmented control into a reusable `@perimeter/ui` component (add arrow-key roving focus), use it in BOTH the inspector AND `SermonTabs.tsx` (drop the line variant there). 

**Audit findings (severity · file:line · fix):**
- **a11y HIGH:** `pagination.tsx:38-55` + `button.tsx:58-64` — `PaginationLink` renders `<a onClick>` with no `href`, and `Button`'s render path adds no `role`/`tabIndex`/keydown → pagination is mouse-only. Fix: make `PaginationLink` real `<button>`s (it's onClick-driven, not navigational). 
- **MED:** `empty.tsx:11` — `border-dashed` with no `border` width/color → no border renders; fix to `border border-dashed border-border`. `widget-runtime/src/providers/error-boundary.tsx:26` — hardcoded `#7a1a1a` (low contrast in dark); use `var(--color-destructive)` + a reload affordance. `ImagePlaceholder.tsx:14` — `aria-hidden` wrapper around a `role="img"`+`aria-label` SVG (conflict); make it cleanly decorative. `VideoPlayer.tsx:165`/`AudioPlayer.tsx:71` range sliders — no `focus-visible` ring. `multi-combobox.tsx:288` — book group headers render as strikethrough rows not headers; `SermonFilters.tsx:120` passes an undeclared `isGroupHeader` + no `environment` for shadow-DOM click-outside. `VideoPlayer.tsx:153` — `bg-stone-900/60` → `bg-black/60`.
- **Loading states (item 6):** `SermonsView.tsx:176`/`SeriesView.tsx:196` skeletons are always a grid shape regardless of `viewMode` → layout jump; make them viewMode-aware. Per-image: confirm/extend the blur-up/skeleton on sermon+series thumbnails (`MediaCard.tsx:44`); add a card-level skeleton where text pops in.
- **De-bloat (item 5):** delete `widgets/sermons/src/components/ui/DatePicker.tsx` (438 lines, ZERO importers — confirmed) and `Modal.tsx` + `Modal.test.tsx` (153 lines, zero importers — confirmed; round-3 polished a focus trap on a component nothing renders). Split `DateRangePicker.tsx` (761 lines → Calendar / RangePresets / popover shell — careful, behind tests). After the darkMode fix, prune now-redundant `dark:` nudges.
- **Studio UX/DX (item 7):** inspector tablist arrow-key nav (folds into the segmented-control extraction); canvas keyboard shortcuts (1/2/3 viewport, `t` theme); persist canvas `background`+`source` into the shareable preview link (today only viewport persists); a per-row "copy `data-*`" affordance on the Info schema table; a canvas "widget failed to load" state distinct from a blank frame.

Repo rules: pnpm only; branch `feat/studio-sermons-r4`; never commit to dev/main; conventional commits; `pnpm format` before `pnpm quality`; tests via turbo `--force`; never touch `docs/superpowers/**`; sermons gz < 900 KiB; PR via Write tool + `--body-file`. No production release here (lands on dev).

---

## Chunk 1: Theming foundation + the visual harness

### Task 1: Branch + systemic `darkMode` variant (the root-cause spike)

**Files:** `packages/theme/src/tailwind.ts`; a small test + a manual build check

- [ ] **Step 1:** `git fetch --prune && git checkout -B feat/studio-sermons-r4 origin/dev`. Baseline: `pnpm install`, `pnpm exec turbo run test --filter=@perimeter/theme --filter=@perimeter/ui --filter=@perimeter/widget-sermons --filter=@perimeter/studio --force` green.
- [ ] **Step 2: Implement the custom dark variant.** In `tailwindPreset` (`tailwind.ts`), add a plugin that registers a `dark` variant matching BOTH contexts: `addVariant('dark', [':host([data-theme="dark"]) &', ':where([data-theme="dark"]) &'])` (do NOT use the built-in `darkMode:'media'`/`'class'` — neither covers the shadow `:host` case). Confirm the existing `containerQueries` plugin still composes.
- [ ] **Step 3: Prove the emitted CSS is correct (build-level).** Build sermons (`pnpm --filter ./widgets/sermons build`) and `grep` the bundle. Use a **value-distinct** dark utility as the probe — `dark:data-active:bg-muted/30` (`tabs.tsx:147`, no light equivalent), NOT `dark:data-active:text-fg` (redundant with its base, so its selector wouldn't prove anything). Confirm that rule's selector includes `:host([data-theme="dark"])` (widget/shadow context) → present; grep for `prefers-color-scheme` from `dark:` utilities → absent. The studio chrome side (`:where([data-theme=dark])`) is verified in the harness (Task 2).
- [ ] **Step 4:** Run the gate `--force` → green (nothing should break; this only re-targets `dark:` variants). Commit: `fix(theme): dark: variants key off data-theme (shadow :host + :root), not OS preference`.

### Task 2: Studio Playwright visual-verification harness

**Files:** Create `studio/visual/` (or reuse `packages/parity`'s playwright config pattern): `studio/playwright.config.ts`, `studio/visual/helpers.ts` (launch + API mock + theme toggles + computed-style/screenshot helpers), `studio/visual/smoke.spec.ts`; a `pnpm --filter @perimeter/studio visual` script; fixtures (a small sermons API JSON fixture)

- [ ] **Step 1: Build the harness — COPY `packages/parity/playwright.config.ts`** (don't author fresh): it already has the `webServer` running `pnpm --filter @perimeter/studio dev` at `localhost:5173` with `reuseExistingServer:true` + `cwd:'../..'`, and the proven shadow-ready wait pattern (`waitForFunction(() => …shadowRoot?.childElementCount)`). Add `--port 5173 --strictPort` to the webServer command (studio sets no `server.port`, avoid port drift). Helpers (`studio/visual/helpers.ts`): (a) **route-mock the sermons API** — `page.route('**/api/sermons**', …)` returning a small fixture (sermons + series + facets) so the widget renders WITHOUT a running perimeter-api (dev base is `localhost:5500`; the mock intercepts before the nonexistent :5500 fails); also mock `**/api/sermons/**/image` with a tiny PNG; (b) `setWidgetTheme(page,'dark'|'light')` — interacts with the **Canvas "Preview theme" segmented group** (`Canvas.tsx:227`, role=group aria-label="Preview theme"), which sets `data-theme` on the shadow host (THIS is the control for the dropdown/text-color assertions, NOT the chrome toggle); `setStudioTheme(page,…)` — the Sidebar chrome toggle (`document.documentElement`); (c) `readComputedColor(page, shadowSelector)` via `page.evaluate` reaching `.shadowRoot`; (d) screenshots to `studio/visual/__screenshots__/` (gitignored). Use the shadow-ready `waitForFunction` (or `waitForResponse` on the mocked route) before reads — don't race the React Query mount.
- [ ] **Step 2: A smoke spec** proving the harness works: navigate to `/widgets/sermons`, mock the API, wait for the shadow mount, assert the grid renders cards; toggle the **widget** theme to dark, open a sort/view dropdown, and read the computed `color` of an option + a card title — both should be light (high luminance) on dark. Write the assertions for the CORRECT post-fix behavior (red now, green after the fixes).
- [ ] **Step 3: Prevent the vitest/Playwright collision (REQUIRED — studio `vite.config.ts` has NO `test` block, so vitest's default include `**/*.{test,spec}.tsx` WOULD collect `visual/*.spec.ts` and fail).** Mirror `packages/parity`: either set `test: { exclude: [...configDefaults.exclude, 'visual/**'] }` (or `include: ['src/**/*.test.tsx']`) in `studio/vite.config.ts`, OR scope the unit `test` script with `--dir src`. Add a `"visual": "playwright test"` script. Gitignore screenshots/results. Run `pnpm --filter @perimeter/studio visual` (harness launches, mock feeds data, assertions run — some red = the bugs) AND `pnpm --filter @perimeter/studio test` (must NOT pick up the spec). Commit: `test(studio): playwright visual-verification harness (API-mocked, theme-aware)`.

---

## Chunk 2: The three specific items (visually verified)

### Task 3: Sort/View dropdown dark text (`text-fg`)

**Files:** `packages/ui/src/sort-select.tsx`, `packages/ui/src/icon-select.tsx`; the visual spec

- [ ] **Step 1:** Add `text-fg` to the popup container `<div>` in both files (`…bg-bg text-fg shadow-md…`). (Option buttons then inherit `text-fg`, which swaps under dark.) 
- [ ] **Step 2: Verify via the harness** — extend the visual spec: in widget dark mode, open the Sort and View dropdowns and assert the option text computed `color` is the light dark-mode `--color-fg` (high luminance), not dark. Run `pnpm --filter @perimeter/studio visual` → the dropdown assertions pass. Also run unit tests `--force`. Commit: `fix(ui): sort/view dropdown popups set text-fg (readable option text in dark)`.

### Task 4: Segmented tab control in `@perimeter/ui`, used by inspector + sermons

**Files:** Create `packages/ui/src/segmented-tabs.tsx` (extract from `Inspector.tsx`, add arrow-key roving focus); refactor `studio/src/components/Inspector.tsx` to use it; refactor `widgets/sermons/src/components/SermonTabs.tsx` to use it (drop the `@perimeter/ui` Tabs line variant); tests + visual

- [ ] **Step 1: Extract.** Create `packages/ui/src/segmented-tabs.tsx` AND wire its package export entry (`@perimeter/ui` uses per-file subpaths like `@perimeter/ui/tabs` — add the `./segmented-tabs` export to `packages/ui/package.json` so both consumers import `@perimeter/ui/segmented-tabs`). Extract from the inspector's implementation: `role="tablist"` of `role="tab"` buttons, rounded `bg-muted` track, active = `bg-bg text-fg shadow-sm`, `aria-selected`, roving `tabIndex`, **plus `onKeyDown` for ArrowLeft/ArrowRight wrap-around focus** (the WAI-ARIA pattern — currently missing). **Controlled API** `{ items: {id,label}[]; value; onChange; 'aria-label'? }` (both the inspector and SermonTabs are controlled — controlled-only serves both). Token-correct in light + dark.
- [ ] **Step 2: Use it.** Inspector renders `<SegmentedTabs>` (remove its inline tablist). `SermonTabs` renders `<SegmentedTabs>` with sermons/series (remove the `@perimeter/ui` Tabs line variant usage). 
- [ ] **Step 3: Tests + visual.** Unit: arrow-key moves selection/focus with wrap; `aria-selected` correct; click selects. Visual: in the harness, the sermons/series control shows a clearly-selected segment (assert the active segment's computed background differs from inactive) in BOTH light and dark, and the inspector tabs still work. Run `--force` + `visual` → green. Commit: `feat(ui): reusable SegmentedTabs (arrow-key a11y); inspector + sermons tabs adopt it`.

### Task 5: Config-tab horizontal alignment

**Files:** `studio/src/components/ConfigPanel.tsx`; tests + visual

- [ ] **Step 1: Implement (tighten the EXISTING grid — it already uses `grid-cols-[minmax(6rem,auto)_1fr]` with `items-baseline`).** The misalignment is: `items-baseline` (not `items-center`), controls with `py-1` and no uniform height, and the boolean `size-4` checkbox not aligned to the control column. Fix: `grid-cols-[minmax(7rem,auto)_1fr]` + `items-center`; give text/number/select controls a uniform `h-9 w-full`; left-align the checkbox in the control column (`justify-self-start`, not stretched); align the hint line under the control column. Keep the round-3 typed-value emission + hints. Tokenized.
- [ ] **Step 2: Verify.** Unit: each field type renders in the grid with the control in column 2. Visual: screenshot the Config tab (example widget has boolean+enum+number+string) and assert the controls' left edges align (compare boundingBox.x of the controls). Run `--force` + `visual`. Commit: `fix(studio): config tab fields align in a consistent label/control grid`.

---

## Chunk 3: a11y + correctness fixes

### Task 6: Pagination a11y + Empty border + ImagePlaceholder + sliders + error-boundary + MultiCombobox

**Files:** `packages/ui/src/{pagination,button,empty,multi-combobox}.tsx`, `packages/widget-runtime/src/providers/error-boundary.tsx`, `widgets/sermons/src/components/ui/ImagePlaceholder.tsx`, `widgets/sermons/src/components/players/{VideoPlayer,AudioPlayer}.tsx`, `SermonFilters.tsx`; tests + visual

- [ ] **Step 1: Pagination (HIGH).** Make `PaginationLink` render a real `<button type="button">` (it's onClick-driven, not navigational) so it's tab-focusable + Enter/Space-activatable + SR-correct; keep `aria-current="page"` on the active page. **Blast radius — update these too or the gate/docs go stale:** `packages/ui/tests/pagination.test.tsx` currently asserts `tagName==='A'` / `getByRole('link')` with `href` — rewrite it to expect a `button`; and `docs/components/pagination.mdx` describes the items as anchors with `href` — update the prose. Verify with the unit test (control is a button, focusable, keydown activates) + a harness keyboard check.
- [ ] **Step 2: The rest.** `Empty`: `border border-dashed border-border`. `error-boundary.tsx`: replace `#7a1a1a` inline color with `var(--color-destructive)` (keep inline style since a crashed tree's Tailwind classes may be purged) + add a "Reload" button. `ImagePlaceholder`: make it cleanly decorative (`aria-hidden` wrapper, drop the SVG's `role="img"`/`aria-label`). Range sliders (Video/Audio): add `focus-visible:ring-2 focus-visible:ring-primary`. `MultiCombobox`: render group headers distinctly (or drop the unused `isGroupHeader`); make downshift's click-outside/active-element checks shadow-correct by deriving the `Environment` **internally from `containerRef.current?.getRootNode()`** (the established pattern in `use-click-outside.ts` + `VideoPlayer.tsx`) — the component already accepts+forwards an `environment` prop, so do it internally with NO runtime-context plumbing and NO `SermonFilters` prop change. `VideoPlayer.tsx:153`: `bg-black/60`.
- [ ] **Step 3:** Unit tests for each + a harness a11y/visual pass (pagination keyboard-reachable; empty card shows its dashed border; error boundary readable in dark). `--force` + `visual` → green; sermons gz < 900. Commit: `fix: a11y + correctness sweep (pagination keyboard, empty border, error-boundary token, decorative placeholder, slider focus, shadow-aware combobox)`.

---

## Chunk 4: Loading states (item 6)

### Task 7: viewMode-aware skeletons + image + card loading

**Files:** `widgets/sermons/src/components/sermons/SermonsView.tsx`, `series/SeriesView.tsx`, `MediaCard.tsx`, a `SermonSkeleton`; tests + visual

- [ ] **Step 1: Implement.** **The per-image skeleton/blur-up + ImagePlaceholder fallback already EXIST** in `MediaCard`'s `FallbackImage` (`~35-56`: `<Skeleton>` while `!loaded`, opacity fade-in on `onLoad`, `ImagePlaceholder` on `onError`) — do NOT redo it; just confirm it works in the harness. **The real gap is the viewMode-aware card/grid skeleton:** `SermonsView.tsx:176` + `SeriesView.tsx:197` hardcode the SAME `h-48` grid skeleton regardless of `viewMode` → layout jump on load. Extract a `SermonSkeleton`/`CardSkeleton` matching each `viewMode` (grid → `h-48` card, list → thin `h-14` row, large → wide horizontal) and render `perPage` of them in the viewMode-correct grid while the query loads, so the loading shape equals the loaded shape.
- [ ] **Step 2: Verify.** Unit: the loading branch renders the right skeleton per viewMode. Visual (harness, with the API mock DELAYED so the loading state is observable): screenshot the loading state in grid/list/large and assert skeletons present + same column structure as loaded; assert an image shows a skeleton before load and the real `<img>` after. `--force` + `visual` → green; gz < 900. Commit: `feat(sermons): viewMode-aware skeletons + image blur-up loading states`.

---

## Chunk 5: De-bloat / cleanup (item 5)

### Task 8: Delete dead code + split DateRangePicker + prune dark:

**Files:** delete `widgets/sermons/src/components/ui/DatePicker.tsx`, `Modal.tsx`, `tests/components/ui/Modal.test.tsx`; split `DateRangePicker.tsx`; prune redundant `dark:` classes

- [ ] **Step 1: `DatePicker.tsx` is the ONLY safe immediate delete.** `git rm widgets/sermons/src/components/ui/DatePicker.tsx` (zero importers — confirmed). **DO NOT delete `Modal.tsx` yet — it is NOT dead:** the live `DateRangePicker.tsx:5` imports `Modal` (its popover shell IS a `<Modal>`), and DateRangePicker is used by `SermonFilters` + `SeriesView`. Modal becomes deletable only AFTER Step 2 migrates DateRangePicker off it. Run the sermons gate `--force` → green.
- [ ] **Step 2: Split `DateRangePicker.tsx` (761 lines) — careful, characterization tests FIRST (it has NONE today — mandatory, not optional).** Write characterization tests (open, pick a range, presets, manual day/month/year inputs, clear) and confirm green. Then extract `Calendar` (the month grid), `RangePresets`, and a **self-contained popover shell** that replaces the `<Modal>` dependency (so DateRangePicker no longer imports `Modal`), with `DateRangePicker` composing them. Behavior identical — characterization tests stay green. **Now** delete the dead `Modal.tsx` + `tests/components/ui/Modal.test.tsx` (re-confirm no remaining importer after the migration). Gate `--force` → green.
- [ ] **Step 3: Prune `dark:` CONSERVATIVELY (Task 1 just made these functional for the first time — there's no prior verified baseline, so default to KEEPING).** Delete ONLY classes whose value is byte-identical to the base utility (e.g. `SermonTabs.tsx:31` `data-active:text-fg dark:data-active:text-fg` → drop the redundant dark one). KEEP every value-changing `dark:` (`dark:bg-muted/30`, `dark:data-active:bg-muted/30`, `dark:hover:bg-muted/50`, `dark:aria-invalid:ring-destructive/40`, …) — those are genuine dark-only tweaks now correctly wired. Verify light + dark via the harness after any prune.
- [ ] **Step 4:** Full sermons + ui gate `--force` + `visual` → green; gz < 900 (should drop). Commit: `refactor: delete dead DatePicker/Modal, split DateRangePicker, prune redundant dark: classes`.

---

## Chunk 6: Studio UX/DX (item 7)

### Task 9: Canvas shortcuts + persist surface/source + Info copy + canvas load-error

**Files:** `studio/src/components/Canvas.tsx`, `studio/src/hooks/use-preview-config.ts` (persist more state), `studio/src/components/InfoPanel.tsx`, `studio/src/pages/WidgetPage.tsx`; tests + visual

- [ ] **Step 1: Implement.** Canvas keyboard shortcuts (1/2/3/4 = viewport presets, `t` = toggle widget theme) with a small "?"/hint affordance; don't hijack typing in inputs. Persist **`background` (surface) only** into the shareable preview-link state (extend `use-preview-config`/`preview-link`) — do NOT persist `source` (it's DEV-only, gated by `import.meta.env.DEV` and tree-shaken from prod, so a shared `source=built` link is non-reproducible on style.perimeter.org). `InfoPanel`: a per-field "copy `data-*` attr" affordance (mirror the token/embed copy pattern), converting the camelCase schema key → kebab for the attr (e.g. `perPage` → `data-per-page="12"`). Canvas: a distinct "widget failed to load its module" state (vs a blank frame) if the dynamic import/mount fails (the runtime ErrorBoundary covers render crashes; this covers load/mount failure surfaced in the canvas). (Inspector arrow-key nav already landed in Task 4.)
- [ ] **Step 2: Verify.** Unit: shortcuts change state (and are ignored while focused in an input); preview-link round-trips background+source; Info copy calls clipboard. Visual: a shared link with a non-default surface+theme hydrates correctly. `--force` + `visual` → green. Commit: `feat(studio): canvas keyboard shortcuts, full preview-link state, info copy, canvas load-error state`.

---

## Chunk 7: Broad component pass + finalize

### Task 10: Remaining audit findings + whole-widget visual sweep

**Files:** any remaining audit items not yet covered; the visual spec (comprehensive sweep)

- [ ] **Step 1: Sweep the audit's residual findings** not covered by Tasks 1–9 (re-read the audit list; e.g. any other `bg-*`-without-`text-*` popups, missing alt text, key warnings, effect leaks). Fix the real ones; record anything deliberately deferred. Grep the whole project for hardcoded colors (`hex`, `gray-/stone-/slate-/zinc-`, `text-black`, `bg-white`) and confirm only intentional ones remain (the canvas inspection surfaces, the always-dark video stage).
- [ ] **Step 2: Comprehensive visual sweep** in the harness: the sermons widget in BOTH light and dark — cards, filters, tabs, sort/view dropdowns (open), pagination, a sermon detail with a media tab, loading + empty + error states — screenshot each and assert no dark-on-dark / light-on-light. For the contrast sanity check, the helper must **walk up to the first ancestor with a non-transparent `background-color`** before computing the text-vs-bg WCAG ratio — an element's own `background-color` is usually `rgba(0,0,0,0)` (transparent), which would false-pass. The studio chrome in both themes. Record the screenshots as the evidence the visual fixes actually landed.
- [ ] **Step 3:** Commit any fixes: `fix: residual theming/a11y findings from the full component pass`.

### Task 11: Gate + PR

- [ ] **Step 1:** `pnpm format`, `pnpm quality`, `pnpm exec turbo run test --filter=@perimeter/studio --filter=@perimeter/ui --filter=@perimeter/widget-sermons --filter=@perimeter/theme --force`, `pnpm --filter @perimeter/studio visual` (the full sweep), `pnpm --filter @perimeter/studio build`. All green; sermons gz < 900; prod studio build no dev-only/visual leakage (the `visual/` harness must not ship — it's test-only).
- [ ] **Step 2: PR.** Push `feat/studio-sermons-r4`; PR body via the Write tool — the systemic darkMode fix, the visual harness (and that visual outcomes are now MACHINE-verified via Playwright screenshots/computed styles, a change from prior rounds), the three specific items, the a11y + loading + de-bloat + studio-UX pass; attach/reference the key before/after screenshots if practical; note shipping to prod is a separate `pnpm release sermons --minor` (→1.2.0) + dev→main. `gh pr create --base dev --body-file …`. Do NOT merge.
- [ ] **Step 3:** Report the PR URL + a summary of what the Playwright harness actually verified (the cycle-breaker) vs anything still needing a human glance.

---

## Execution notes

- Sequential within the shared tree. Task 1 (darkMode variant) + Task 2 (harness) are the foundation — do them first; every later visual task uses the harness as its gate.
- **The Playwright harness is the headline process change:** for the first time, theming/selection/loading/contrast outcomes are verified by a real browser (computed styles + screenshots), not just structural assertions. If the harness can't be made reliable in this environment (dev-server + chromium), fall back to the strongest structural checks AND clearly flag every visual item for the user's manual studio check — but try hard to make it work; it's the point of this round.
- The darkMode custom-variant (Task 1) is the riskiest change — verify it in BOTH the widget shadow context and the studio light-DOM context (the harness covers studio; the build-grep + a widget render cover the shadow side). If the multi-selector variant misbehaves, a documented fallback is separate variants for widget vs studio configs.
- No production release. Shipping = `pnpm release sermons --minor` (→1.2.0) + dev→main when the team wants rounds 1–4 live.
