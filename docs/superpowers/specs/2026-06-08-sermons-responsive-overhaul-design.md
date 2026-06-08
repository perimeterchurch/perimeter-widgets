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

## Design

### 1. Studio preview fidelity — responsive `HostFrame` gutter

`HostFrame` keeps its desktop content max-width but its **horizontal gutter becomes responsive to the frame width**: the full ~90px gutter at desktop frame widths ramps down toward a ~16px mobile gutter below ~640px, mimicking how a responsive WordPress theme collapses its gutter on phones. Net effect: the Mobile preset renders the widget at ~343px (375 − ~32) and the Tablet preset at ~720px+, both realistic, instead of crushing to 195px.

- Implementation keys off the frame width that `Canvas` already resolves (`studio/src/components/Canvas.tsx` — `resolvedPx`/`width`), passed into `HostFrame`, or via a container query on the frame. The exact mechanism is settled in the plan; the contract is: **gutter scales with frame width, never exceeding the content, ~16px floor on phones, ~90px at desktop.**
- `hostProfile.contentPaddingX` stays the desktop value (single source of truth for the desktop gutter); the ramp is a `HostFrame` concern, not a new profile constant.
- Rejected alternatives: a separate "mobile host profile" constant (two sources of truth); shrinking only the widget's own padding (doesn't recover the 180px the gutter steals).

### 2. Phone (container < 30rem)

- **Compact list is the default view.** Phones default the view mode to the existing `list` layout (`MediaCard` `viewMode === 'list'` — 40px thumbnail + title + date·speaker, ~7/screen). Tablet/desktop keep `grid`. The default is applied only when the user has not explicitly chosen a view (the `View` switcher still works — see below); it must not override an explicit user/URL selection.
- **Inline-collapsible filters.** The search field stays visible. Series / Speaker / Book / date-range collapse behind a `Filters` toggle showing an active-filter count badge and a `Clear` affordance; tapping it expands the four controls inline (no modal/sheet component). Tablet/desktop keep filters always-visible in their current row/stack.
- **Compact Sort/View toolbar.** At phone width the Sort and View triggers drop their verbose `Sort by:` / `View:` prefixes (icon + current value only) so they stop truncating, and the toolbar wraps the controls onto their own row beneath the result count.
- **Responsive date picker.** The date-range popover renders full-width (anchored within the widget container) on phone rather than a fixed-width popover that can overflow a narrow container.
- **Single-column detail.** `SermonDetail` / `SeriesDetail` stack to one column on phone; media/player and related-sermons lists go full-width and stack.

### 3. Tablet (≥ 30rem) / Desktop (≥ 48rem)

- Keep the 2-column grid (tablet) / 3-column grid (desktop) with inline-row filters — already solid; verify the grid breakpoint so tablet-portrait reliably lands on 2 columns.
- **Fix the Sort/View label truncation** at these widths too (the `truncate` + `max-w-full` triggers squeeze the labels when both dropdowns share the row).
- The `View` switcher remains available at all widths; phone merely defaults it to `list`.

### View-switcher / default-view contract

The widget tracks the view mode in a nuqs query param (existing). The phone default must:

- apply `list` when the container is narrow **and** no explicit view has been chosen;
- never clobber an explicit choice (user click or `?sermons-view=` in the URL);
- not thrash on resize (no churn between renders at a stable width).

The exact state mechanism (e.g., treat "unset" distinctly from an explicit value, and resolve the effective view from container width when unset) is decided in the plan.

## Components touched (initial map; the plan finalizes)

- `studio/src/components/HostFrame.tsx`, `studio/src/components/Canvas.tsx` — responsive gutter.
- `widgets/sermons/src/App.tsx` — container breakpoints, filter region, default-view wiring.
- `widgets/sermons/src/components/ui/ResultsToolbar.tsx` — compact phone toolbar, label truncation fix, wrap behavior.
- The filters region (search + the Series/Speaker/Book selects + `DateRangePicker`) — collapsible wrapper on phone; `DateRangePicker`/`DateRangePopover` full-width on phone.
- `widgets/sermons/src/components/sermons/SermonDetail.tsx` / `SeriesDetail.tsx` — single-column phone layout.
- `MediaCard.tsx` is reused as-is for the `list` layout (already exists); no new card component.

## Testing

Playwright visual specs in `studio/visual/` driven at phone/tablet/desktop **container** widths (using a realistic surface so the frame width == widget width, per the exploration method). Assert:

- no horizontal overflow at phone (≈343–375px), tablet (≈720px), desktop;
- phone defaults to the `list` layout; tablet/desktop render the grid (2-col / 3-col);
- phone filters are collapsed by default and expand on toggle; the active-count badge reflects set filters;
- the Sort/View triggers do not truncate at phone/tablet;
- the studio **Mobile/Tablet presets** now yield realistic widget widths (regression for the `HostFrame` gutter fix);
- the date-range popover fits within a phone-width container.

Unit/behavior tests (vitest) cover the default-view resolution (unset-on-narrow → list; explicit choice preserved; no resize thrash) and the filter-collapse active-count logic.

The visual harness is run by the **main agent**, not workflow subagents (it has hung subagents before).

## Out of scope

- The intentional player chrome (`VideoPlayer` / `MediaTabs` black/white) and `PdfViewer` white pages (not themeable) — unchanged.
- Any data/API or perimeter-api changes — this is presentation only.
- The `dev → main` production release (separate, already-pending step).
