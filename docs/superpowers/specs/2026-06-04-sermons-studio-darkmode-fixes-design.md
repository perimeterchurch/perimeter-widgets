# Sermons + Studio Fixes & Platform Dark Mode — Design

**Date:** 2026-06-04
**Status:** Approved design, pre-planning
**Builds on:** the completed 5-phase overhaul (parity, studio+site, DX, docs+skill — all on `dev`).

## Problem

Six reported issues across the sermons widget and the studio, traced to root cause (read-only investigation, file:line cited in the plan):

1. **Studio inspector is stretched horizontally** — it's a right grid column (22rem at `xl`, full-width stacked below `xl`), not a vertical panel.
2. **Studio preview won't scroll** — the `Canvas` scroll surface is `flex-1 overflow-auto` but lacks `min-h-0`, and its grid cell clips with `overflow-hidden`, so tall widget content expands/clips instead of scrolling.
3. **Cards stuck light / no dark mode** — the platform has **no dark theme at all** (`@perimeter/theme` `globalTokens` is light-only; `resolveTokens` emits a single `:host` block). The sermons local components hardcode `stone-*` colors with dead `dark:` variants that never activate.
4. **Not responsive** — sermons grids use **viewport** breakpoints (`sm:`/`lg:`), which key off the browser viewport, not the widget container — wrong in a shadow-root widget rendered at an arbitrary width.
5. **Images missing (dev)** — two disagreeing API base URLs: data goes through the runtime mount (defaults to **prod** `api.perimeter.org`), but `format.ts` image URLs resolve to `''` same-origin in dev = `localhost:5173/api/...` → 404.
6. **Dev should use the local API** — nothing points the dev studio at the local perimeter-api (`localhost:5500`).

## Goal

Dark mode works end-to-end (and is embeddable in production); the sermons widget themes correctly and responds to its container width; the studio preview scrolls, its inspector is a slide-out drawer, and in dev it talks to the local perimeter-api so data **and** images load.

## Locked decisions (user-chosen)

- **Real platform dark mode** — a dark token set + `data-theme="dark"` activation that works in production embeds, the studio toggle themes the widget, and sermons is tokenized so it cascades.
- **Inspector = slide-out overlay drawer** — closed by default, slides over the preview (toggle + backdrop), vertical layout inside; canvas gets full width.
- **One coordinated effort** — a single spec + phased plan + workflow.

## Design

### 1. Platform dark mode — `@perimeter/theme` + runtime

- **`darkTokens`** (new export in `tokens.ts`): dark values for the `color-*` tokens only (radii/fonts unchanged). Keep the same keys as `globalTokens` so the override layering is symmetric.
- **`resolveTokens()`** emits **two blocks** in `cssText`:
  ```css
  :host { /* light: globalTokens + widget/dataAttr/runtime overrides */ }
  :host([data-theme="dark"]) { /* dark: darkTokens + the same overrides */ }
  ```
  This is injected via the existing per-instance **token sheet** (`styling.ts`), so live `updateTokens` still works and the dark block rides along. Dark mode is then a pure CSS-variable swap — no per-component dark classes.
- **Activation = `data-theme="dark"` on the host element.** The `[data-perimeter-widget]` div *is* the shadow host, so `:host([data-theme="dark"])` matches with **zero mount parsing**, and it works in production embeds: `<div data-perimeter-widget="sermons" data-theme="dark">`. **Verified safe:** a bare `data-theme` does NOT match the `data-theme-` per-token override prefix (so it's not consumed there); it becomes a `theme` config key that `schema.parse` **strips** as unknown (zod default object behavior — does not throw); and `parseDataAttrs` never removes attributes, so the `data-theme="dark"` attribute survives on the host for the CSS selector to match. **Load-bearing constraint:** this relies on widget schemas being non-strict (the default). A widget schema must NOT use `.strict()`, or a bare `data-theme="dark"` would throw at `schema.parse` and white-screen the embed — add a guard test (below) and a one-line note in the docs.
- **Embed contract:** document `data-theme="dark"` (and the default light) as a supported embed attribute in the hosting/embed docs.

### 2. Sermons tokenized

- Replace every hardcoded `stone-*` (and the dead `dark:` pairs) across the local components (`SermonDetail`, `SeriesDetail`, `AudioPlayer`, `VideoPlayer`, `PdfViewer`, `ImagePlaceholder`, `DatePicker`, `DateRangePicker`, plus any others the audit lists) with semantic tokens: `bg-bg`/`text-fg`/`text-muted-fg`/`border-border`, and `bg-muted` for subtle surfaces/hovers. The `@perimeter/ui` components already use tokens — leave them.
- If the stone scale needs a shade the current tokens don't cover (e.g. a distinct subtle "card" vs "page" surface), add **at most one** token (`color-muted` already exists; prefer reusing it). Any new token must get both light and dark values.
- After tokenizing, dark cascades automatically — remove the now-redundant `dark:` variants rather than leaving dead classes.

### 3. Responsive via container queries

- Add `@tailwindcss/container-queries` to the `@perimeter/theme` Tailwind preset (single source, so every widget gets it). Add it as a dependency where the preset resolves plugins.
- Mark the sermons widget root (`App.tsx` `<div className="p-4">`) as a container (`@container` / `container-type: inline-size`).
- Rewrite the grids + skeletons (`SermonGrid`, `SeriesGrid`, `SermonsView`, `SeriesView`) from viewport variants (`sm:grid-cols-2 lg:grid-cols-3`) to container variants (`@sm:grid-cols-2 @lg:grid-cols-3`), and the filter row similarly. Layout now responds to the widget's own width at any embed size.

### 4. Studio scroll fix

- Add `min-h-0` down the `Canvas` flex chain (the root `flex h-full flex-col` and the `flex-1 overflow-auto` surface) and to the `WidgetPage` grid cell, so the preview surface scrolls instead of expanding and being clipped by the grid's `overflow-hidden`. The widget itself stays height-unconstrained (it grows; the canvas scrolls).

### 5. Inspector → slide-out overlay drawer

- Replace the `WidgetPage` right grid column with a **closed-by-default drawer**: a toggle button (e.g. in the page header or canvas toolbar) opens a right-side panel that slides **over** the preview with a backdrop; Escape / backdrop-click / a close button dismiss it. Canvas is full-width when closed. Inside, the Config/Theme/Info tabs stack vertically with comfortable width.
- Add a **light/dark theme toggle** to the canvas toolbar (distinct from the background-surface buttons): it sets `data-theme` on the preview host (`[data-perimeter-widget-preview]`) **exactly** — that div is the shadow host; `:host()` only matches the shadow host itself, NOT an ancestor, so do not attach it to the `HostFrame` wrapper or the canvas frame. (The background-surface buttons stay as inspection surfaces.)
- Keep the render-test hooks (`data-canvas-frame`, `data-canvas-surface`, `data-perimeter-widget-preview`, the error box) intact.

### 6. Dev API → `localhost:5500`, unified

- One source of truth for the dev API origin: **`VITE_API_URL=http://localhost:5500`** for the studio dev server (a Vite `define`/env in `studio/vite.config.ts` or `.env.development`), so `format.ts` (image URLs) reads it (its existing priority-2 path).
- The studio also feeds the **runtime** the same origin so data hooks agree: set `globalThis.__PERIMETER_API_URL__` from that value in the studio (e.g. `main.tsx`, DEV-only) **or** pass `apiBaseUrl` in `WidgetPreview`'s `mount(...)` call. These are **two independent code paths**: `VITE_API_URL` alone only fixes images (`format.ts`); the data/hooks path still needs the global or `apiBaseUrl`. The plan must wire **both** knobs so data + images both resolve to `localhost:5500` in dev. In production both fall back to `api.perimeter.org` (unchanged).
- **Requires the local perimeter-api running** (`pnpm dev` → `:5500`). Document this as a studio dev prerequisite (run instructions / developer-setup / the building-a-widget guide). Dev perimeter-api CORS already allows all origins, so `localhost:5173 → :5500` works.

## Testing

- **Theme:** unit-test `resolveTokens` emits both `:host` and `:host([data-theme="dark"])` blocks with the right values + override layering; `darkTokens` has the same keys as `globalTokens`.
- **Runtime:** a happy-dom test that a host with `data-theme="dark"` resolves dark token values (and without it, light), AND that mounting a widget on a host carrying `data-theme="dark"` does not throw (guards the non-strict-schema assumption the activation depends on).
- **Sermons:** the existing widget tests stay green; bundle budget unchanged (CSS-class swaps + container-queries plugin output are small — confirm < 900 KiB). A grep guard that no `stone-` class remains in the tokenized components.
- **Studio:** render tests for the drawer (opens/closes, traps nothing it shouldn't), the theme toggle sets `data-theme`, and the canvas scrolls (structural). Studio build stays a clean read-only gallery.
- **Visual/manual:** in the studio (with local perimeter-api running) — sermons loads data + **images**, the grid reflows by container width at mobile/tablet/desktop presets, dark toggle renders dark cards, and the preview scrolls. The workflow's final step verifies these (build + render tests as the headless-substitute, with the manual checks noted).

## Rollout

One spec, a phased plan executed as a workflow (spec + quality review per task, final review + PR into `dev`). Phases: (A) theme dark tokens + runtime activation; (B) sermons tokenize + responsive; (C) studio scroll + inspector drawer + theme toggle + dev-API wiring; (D) docs (embed `data-theme`, studio-needs-local-api). No production widget release in this effort — a `dev → main` release ships it later (and a `sermons` version bump + `pnpm release` when the team wants the new sermons bundle live).

## Out of scope

- Re-releasing the sermons bundle to production (separate `pnpm release` + dev→main when desired).
- The owner-driven style.perimeter.org Vercel deploy (unchanged).
- Dark-mode auto-detection via `prefers-color-scheme` (could layer on later via a `@media (prefers-color-scheme: dark)` block; this effort does explicit `data-theme` only).
