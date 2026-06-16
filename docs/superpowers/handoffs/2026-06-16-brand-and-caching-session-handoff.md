# Session Handoff — Brand colors/fonts, series sort, facet caching (2026-06-16)

Covers the perimeter-widgets work in this session. All PRs below are **merged to `dev` and released to `main`** unless noted. Paired perimeter-api work is in that repo's `docs/superpowers/handoffs/2026-06-16-sermons-caching-and-sharp-outage-handoff.md`.

## 1. Brand colors — `#60bbe9` accent + `#09243f` navy (PR #142)

Adopted Perimeter's brand palette (sourced from perimeter.org's live CSS — Salient/Nectar `--nectar-*` vars, distinct from the generic WordPress preset colors). Pure design-token change in `@perimeter/theme/src/tokens.ts`; propagates through the CSS-variable system, no component code touched.

- **Accent `#60bbe9`** = `hsl(200.1 75.7% 64.5%)` (exact round-trip) → `color-primary` + `color-ring` (buttons, links, focus), light + dark.
- **`color-primary-fg` flipped to dark navy** — `#60bbe9` is light, so white text is only ~2:1; dark is 8.3:1 (also keeps the `contrast.test.ts` `primary-fg`/`primary` AA guard green).
- **`color-accent`** (menu/dropdown hover surface, was purple) retinted to a soft blue.
- **Dark navy `#09243f`** = `hsl(210 75% 14.1%)` → `color-fg` (headings/body), `color-primary-fg` (button label on accent), `color-secondary` (navy secondary button + white fg; dark mode keeps slate so navy-on-navy doesn't vanish), and a **new `color-surface-dark` (+`-fg`)** token → `bg-surface-dark`/`text-surface-dark-fg` (auto-mapped by `tailwind.ts`).
- **AA fix:** the brand navy (L 14%) is lighter than the old near-black, so `text-fg/60` inactive tab labels dipped to 4.2:1 → bumped to `text-fg/70` (5.7:1) in `tabs.tsx` + `segmented-tabs.tsx`.
- **Intentional tradeoff (do NOT "fix"):** `#60bbe9` is used literally everywhere incl. `text-primary` link/small-accent text (~2.15:1 on white, below AA) — an explicit brand choice, not an oversight.

## 2. Brand fonts — Sweet Sans Pro + Freight Display Pro (PR #145)

perimeter.org uses **Sweet Sans Pro** (sans — body/UI/buttons) and **Freight Display Pro** (serif — large display headings), both **Adobe Fonts/Typekit — commercial, domain-locked, no free self-host**.

- Approach: font availability is **document-scoped, not shadow-encapsulated**, so the brand font is named **first** with free fallbacks. A widget embedded on a Typekit-loaded page (notably perimeter.org itself) renders the real brand font for free; elsewhere it falls back.
- `font-sans` = `"sweet-sans-pro", Inter, system-ui, …`; new `font-serif` token = `"freight-display-pro", "Playfair Display", Georgia, …` (mapped in `tailwind.ts`).
- `font-serif` is available but **not yet applied to any widget heading** — opt-in for now.

## 3. Series filter dropdown → alphabetical (PR #146)

The sermons series filter dropdown now sorts A→Z. One-line change in `use-sermon-facets.ts`: pass `sort: 'title', order: 'asc'` to the dropdown's `useSeries` call. Done via the **existing API param** (not client-side) because the API sorts before paginating, so the capped 50 are the alphabetically-first in order. No perimeter-api change; series grid view unaffected (separate query).

## 4. Facet query caching — `staleTime` (PR #147) — caching "option B"

Sermons facet hooks (`useSpeakers/useBooks/useSeries/useSeriesTypes/useServiceTypes`) now use a shared `FACET_STALE_TIME = 5 min` (was the 30s default). Fewer in-session refetches; mirrors the (attempted) perimeter-api edge cache's `s-maxage=300`. Sermon list/detail keep the shorter default. Primer+narrowed facet queries already dedupe (identical query keys), so no fan-out change was needed.

## Releases / production state

- **sermons@1.4.1** (#136 → #137) and **sermons@1.4.2** (#143 → #144) cut via `pnpm release sermons --patch`; 1.4.2 carries the brand colors to the live embed. **Live on widgets.perimeter.org** (verified manifest + bundle serving the new colors).
- **dev→main releases:** #141, #144, and **#148** (brand fonts + series sort + facet caching). All merged; `dev` == `main`.
- Brand **colors** are live in the shipped bundle; brand **fonts** + **series sort** + **facet caching** are in the repo/bundle source — they reach the live embed on the next `pnpm release sermons` re-cut (not yet done).

## Open / follow-ups

- Cut a fresh `pnpm release sermons` if/when you want the fonts + series sort + facet caching in the live embed bundle (colors already shipped via 1.4.2).
- `font-serif` (Freight Display) is available but unapplied — decide whether widget headings should use it.
- style.perimeter.org studio deploy remains owner-driven (unchanged, pre-existing backlog).

## Key references

- Tokens: `packages/theme/src/tokens.ts`; Tailwind mapping: `packages/theme/src/tailwind.ts`; contrast guard: `packages/theme/tests/contrast.test.ts`.
- Styling model + the three shadow-DOM inheritance transforms: `docs/guides-mdx/styling-widgets.mdx` and CLAUDE.md "Shadow-DOM style inheritance".
