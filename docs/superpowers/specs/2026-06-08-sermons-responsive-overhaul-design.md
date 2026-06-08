# Sermons Widget Responsive Overhaul — Design

**Date:** 2026-06-08
**Status:** Approved (pending spec review + user review)

## Goal

Make the sermons widget render and read well on phones and tablets, and make the studio's Mobile/Tablet viewport presets simulate realistic phone/tablet host widths so the preview tells the truth.

## Background — why it looks broken today

The studio "Mobile" preset sets a 375px canvas frame, but the preview is wrapped in `HostFrame` (`studio/src/components/HostFrame.tsx`), which applies the real WordPress **desktop** content padding (`hostProfile.contentPaddingX: '90px'` per side — `packages/theme/src/host-profile.ts`) at every frame width. So at a 375px frame the widget is squeezed to **195px** (frame − 180px), far narrower than any real phone, and its content overflows: the tab strip and the Sort/View toolbar clip on the right and cards crush.

Measured (Playwright, studio canvas):

| Preset  | Frame | Widget container | Overflow |
| ------- | ----- | ---------------- | -------- |
| Mobile  | 375px | **195px**        | yes (content wants 278px) |
| Tablet  | 768px | 588px            | none |
| Desktop | 1280px| 1100px           | none |

When the same widget is rendered at its true width (canvas surface switched off `host-sim`, so frame width == widget width), there is **no overflow** at 375px or 768px — confirming the clipping is a preview artifact, not a layout bug. The widget's container queries are correct; they were just never given a realistic width in the preview.

Separately, even at realistic widths the phone experience is not polished: five stacked full-width filter controls (search + Series/Speaker/Book + date range) push the first sermon far down the page; the default `grid` view renders ~1.5 huge cards per screen; and the Sort/View dropdown labels (`Sort by:` / `View:`) truncate on narrow toolbars (visible at tablet too).

## Scope

Both halves, confirmed with the user:

1. **Studio preview fidelity** — the Mobile/Tablet presets simulate realistic phone/tablet host widths.
2. **Widget phone + tablet layout overhaul** — polished small-screen UX at realistic widths.

## Architecture — container-query-driven, never viewport

The widget mounts in a shadow root on a host page and can be embedded at **any** width, so "phone" must mean *the widget's container is narrow*, not *the viewport is narrow*. All responsive behavior keys off the existing `@container` on the App root (`widgets/sermons/src/App.tsx:101`) using the established Tailwind container-query variants (`@[30rem]:`, `@[48rem]:` — NOT `@min-[..]:`, which emits no CSS). Breakpoints:

- **Phone:** container `< 30rem` (~480px) — the base (unprefixed) styles.
- **Tablet:** container `≥ 30rem` (`@[30rem]:`).
- **Desktop:** container `≥ 48rem` (`@[48rem]:`).

This is consistent with how the grids already behave and means the phone layout also kicks in for any narrow embed, not just the studio preset.

**One JS exception — the default view mode.** Column counts within a view stay pure CSS container queries. But the *default view mode* (compact `list` on phone vs `grid` elsewhere) selects a different `MediaCard` render branch — different DOM, not stylable by a container query. Resolving it therefore needs the container width in JS. A small `useContainerBreakpoint` hook puts a `ResizeObserver` on the App `@container` root and returns `'phone' | 'tablet' | 'desktop'` (thresholds 30rem / 48rem). It sets state **only when the bucket changes** (compare to previous), so a stable width causes no re-render churn. This same breakpoint drives the toolbar's compact mode (below). Everything else remains CSS.

## Design

### 1. Studio preview fidelity — responsive `HostFrame` gutter

`HostFrame` keeps its desktop content max-width but its **horizontal gutter becomes responsive to the frame width**, mimicking how a responsive WordPress theme collapses its gutter on phones.

**Interface (settled):** `Canvas` already resolves the frame width (`resolvedPx` in `studio/src/components/Canvas.tsx`). It passes it to `HostFrame` as a new `frameWidth?: number` prop (today `HostFrame` takes only `children`). `HostFrame` computes the per-side gutter from it; when `frameWidth` is undefined (fluid, or any other caller) it falls back to the current `hostProfile.contentPaddingX` (90px), preserving existing behavior.

**Gutter ramp (settled):** per-side gutter = `16px` when `frameWidth ≤ 640`, ramping **linearly** to `90px` at `frameWidth ≥ 1200`, clamped to `[16px, 90px]`. `hostProfile.contentPaddingX` stays the desktop value (single source of truth for the 90px endpoint); the ramp is a `HostFrame` concern, not a new profile constant.

**Resulting widget widths + column counts (the visual test targets these):**

| Preset  | Frame | Gutter (per side) | Widget container | Bucket  | Layout       |
| ------- | ----- | ----------------- | ---------------- | ------- | ------------ |
| Mobile  | 375   | 16                | ~343px (< 30rem) | phone   | `list`       |
| Tablet  | 768   | ~33               | ~702px (30–48rem)| tablet  | grid, 2-col  |
| Desktop | 1280  | 90                | ~1100px (≥ 48rem)| desktop | grid, 3-col  |

Rejected alternatives: a separate "mobile host profile" constant (two sources of truth); a container-query ramp inside `HostFrame` (its gutter is an inline `padding` style and `Canvas` already has the number, so a prop is simpler); shrinking only the widget's own padding (doesn't recover the 180px the gutter steals).

### 2. Phone (container < 30rem)

- **Compact list is the default view.** Phones default the view mode to the existing `list` layout (`MediaCard` `viewMode === 'list'` — 40px thumbnail + title + date·speaker, ~7/screen). Tablet/desktop keep `grid`. See the default-view contract below — the default applies only when the user has not explicitly chosen a view, and never clobbers an explicit user/URL selection.
- **Inline-collapsible filters.** The search field stays visible. Series / Speaker / Book / date-range collapse behind a `Filters` toggle showing an active-filter count badge and a `Clear` affordance; tapping it expands the four controls inline (no modal/sheet component). Tablet/desktop keep filters always-visible in their current row/stack. The badge count is a new `activeFilterCount` derived in `useSermonFilters` — the number of *set* filters (series, speaker, book, from, to, …) **excluding locked ones** (`config.*Id` / `hide*`, already tracked in `lockedFilters`). Today the hook exposes only `hasActiveFilters` (boolean) + `lockedFilters` (Set); the count is added alongside them.
- **Compact Sort/View toolbar.** `SortSelect` and `IconSelect` (`@perimeter/ui`) gain an optional `compact` prop that renders icon + current value only, dropping the textual prefix (`Sort by:` is hardcoded in `sort-select.tsx:54`; `View:` is the `label` prop passed from `ResultsToolbar`). `ResultsToolbar` passes `compact` when the breakpoint is `phone`, so the labels stop truncating; at tablet/desktop the full labels fit at realistic widths. `SortSelect` is also used standalone in `SermonDetail` — it keeps the full label there (the prop defaults to non-compact, so that consumer is unaffected). `ResultsToolbar` already uses `flex-wrap` + `gap-y-2` with a reserved count line, so the controls already wrap to their own row when space is tight — no new wrap logic, just the compact triggers.
- **Date-range modal — verify only, likely no change.** `DateRangePopover` is NOT an anchored popover; it is a viewport-`fixed` centered modal (`fixed inset-0 … items-center justify-center`) whose panel is `w-full max-w-[400px]` (single-month) / `max-w-[640px]` (wide). Because the panel is `w-full` capped by a `max-w`, it already shrinks to fit a phone viewport and cannot overflow horizontally. Scope here is to **verify** it fits at phone width and uses the single-month (`max-w-[400px]`) layout on narrow widths; only force the single-month variant if the wide layout is reachable on a narrow screen. No anchored-popover or full-width-within-container work.
- **Detail views — verify only, already single-column.** `SermonDetail` and `SeriesDetail` are already single-column vertical stacks (`space-y-6`, full-width `MediaTabs`, no multi-column/`grid`/`flex-row`). No layout collapse is needed; scope is to **verify** they fit at phone width with no fixed-width child overflowing (e.g., the title + Copy-link header row).

### 3. Tablet (≥ 30rem) / Desktop (≥ 48rem)

- Keep the 2-column grid (tablet, `@[30rem]:`) / 3-column grid (desktop, `@[48rem]:`) with inline-row filters — already solid. Verify against the resolved preset widths in the table above: a ~702px container (Tablet preset) is in `[30rem, 48rem)` → 2-col; a ~1100px container (Desktop preset) is `≥ 48rem` → 3-col.
- The Sort/View label truncation seen in the *crushed* 588px tablet preview was a symptom of the 195/588px artifact; at the realistic ~702px tablet width the full labels fit. The `compact` prop is applied only at the `phone` breakpoint, so tablet/desktop keep the full `Sort by:` / `View:` labels.
- The `View` switcher remains available at all widths; phone merely defaults it to `list`.

### View-switcher / default-view contract (settled)

The widget tracks the view mode in a nuqs query param. Today (`use-sermon-filters.ts:57`) it is `view: parseAsStringLiteral(['grid','list','large']).withDefault(defaultView)` where `defaultView = config.defaultView ?? 'grid'`. With `.withDefault`, absent and default are indistinguishable — `params.view` is never null — so there is no "unset" state to key the phone default on. The fix:

1. **Make the param nullable** — drop `.withDefault` on `view` so `params.view` is `'grid' | 'list' | 'large' | null`, where `null` means "user has not chosen." (Other params keep their defaults; only `view` changes.)
2. **Resolve an effective view inside the hook** — `effectiveView = params.view ?? (breakpoint === 'phone' ? 'list' : (config.defaultView ?? 'grid'))`, using the `useContainerBreakpoint` value. The hook exposes this resolved `view` to consumers (so `App`, `ResultsToolbar`, the `View` switcher all keep reading `view` unchanged — it is just resolved now).
3. **`setView` writes an explicit value** (`history: 'replace'`, as today), so a user click pins `grid`/`list`/`large` into the URL and the default no longer applies.
4. **`?sermons-view=grid` is honored everywhere** — an explicit URL value is a non-null `params.view`, so it wins even on a phone.

This satisfies: phone defaults to `list`; explicit choices (click or URL) are preserved; and because `breakpoint` only changes when the bucket crosses 30rem/48rem, a stable width produces no view churn. The `config.defaultView` widget option continues to set the non-phone default.

## Components touched (initial map; the plan finalizes)

- `studio/src/components/HostFrame.tsx` — new `frameWidth?` prop + gutter ramp; `studio/src/components/Canvas.tsx` — pass `resolvedPx` as `frameWidth`.
- `widgets/sermons/src/hooks/use-sermon-filters.ts` — `view` param nullable; resolve `effectiveView` via breakpoint; add `activeFilterCount`.
- New `useContainerBreakpoint` hook (ResizeObserver on the App `@container` root) under `widgets/sermons/src/hooks/`.
- `widgets/sermons/src/App.tsx` — wire the breakpoint to the filter region (collapsible on phone) and pass it down; the `@container` root already exists.
- `widgets/sermons/src/components/ui/ResultsToolbar.tsx` — pass `compact` (phone) to the Sort/View dropdowns; the `flex-wrap` row already exists.
- `packages/ui/src/sort-select.tsx` + `packages/ui/src/icon-select.tsx` — optional `compact` prop (icon + value, no prefix); defaults to current behavior so the standalone `SortSelect` in `SermonDetail` is unaffected.
- The filters region (search + Series/Speaker/Book selects + `DateRangePicker`) — collapsible wrapper on phone driven by the breakpoint.
- `MediaCard.tsx` is reused as-is for the `list` layout (already exists) — no new card component.
- **Verify-only (no expected change):** `DateRangePopover` (already a fit-to-viewport modal), `SermonDetail.tsx` / `SeriesDetail.tsx` (already single-column).

## Testing

Playwright visual specs in `studio/visual/` driven at phone/tablet/desktop **container** widths (using a realistic surface so the frame width == widget width, per the exploration method). Assert:

- no horizontal overflow at phone (≈343–375px), tablet (≈720px), desktop;
- phone defaults to the `list` layout; tablet/desktop render the grid (2-col / 3-col);
- phone filters are collapsed by default and expand on toggle; the active-count badge reflects set filters;
- the Sort/View triggers do not truncate at phone/tablet;
- the studio **Mobile/Tablet presets** now yield realistic widget widths (regression for the `HostFrame` gutter fix);
- the date-range popover fits within a phone-width container.

Unit/behavior tests (vitest) cover: the `effectiveView` resolution (`params.view` null + phone → `list`; null + tablet/desktop → `config.defaultView ?? 'grid'`; an explicit `params.view` or `?sermons-view=` preserved on phone); `activeFilterCount` (counts set filters, excludes `lockedFilters`); and `useContainerBreakpoint` only changing state on a bucket crossing (no churn at a stable width). The `HostFrame` gutter ramp is verified via the studio-preset visual regression above.

The visual harness is run by the **main agent**, not workflow subagents (it has hung subagents before).

## Out of scope

- The intentional player chrome (`VideoPlayer` / `MediaTabs` black/white) and `PdfViewer` white pages (not themeable) — unchanged.
- Any data/API or perimeter-api changes — this is presentation only.
- The `dev → main` production release (separate, already-pending step).
