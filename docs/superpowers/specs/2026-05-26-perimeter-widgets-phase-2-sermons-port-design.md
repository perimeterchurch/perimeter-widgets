# Perimeter Widgets — Phase 2: Sermons Port Design

**Status:** Proposed
**Date:** 2026-05-26
**Author:** parkerb@perimeter.org (with Claude)
**Umbrella:** `2026-05-22-perimeter-widgets-rebuild-design.md`
**Previous phase:** `2026-05-22-perimeter-widgets-phase-1-foundation-design.md` (complete)

## Purpose

Port the existing sermons widget from the archived `legacy/v1` branch onto the new Phase 1 platform. Sermons is the first real widget consumer of the rebuild and the proof that the platform survives contact with the most complex production widget Perimeter ships.

This phase ends when sermons builds, all tests pass, and the widget renders in Studio with behavioral parity to the legacy implementation. Hosting and the WordPress cutover stay in Phases 3 and 4.

## Goals

1. Faithful 1:1 port: every feature, every config attribute, both tabs, all view + display modes, media playback, URL-backed filter state, animations.
2. Add `@perimeter/api-types` — codegen'd OpenAPI types from `perimeter-api/openapi/spec.yaml`.
3. Add `@perimeter/api-hooks` — typed React Query hooks for every sermons endpoint. Future widgets that consume the same endpoints share these.
4. Refactor sermons during the port so `config` is drilled as a prop. The legacy `useConfig()` hook is not reproduced in the new runtime.
5. Port every legacy test. Hook tests relocate to `@perimeter/api-hooks`; widget-internal tests stay in `widgets/sermons/`.
6. Raise the per-widget bundle budget to **500 KB gzipped**. Sermons is structurally larger than the 220 KB Phase 1 ceiling because of react-pdf, HLS.js, framer-motion, luxon, nuqs, headlessui, lucide-react.
7. Sermons renders in Studio at `/widgets/sermons` (Native + As-shipped); the existing theme-override flow propagates.

## Non-goals (Phase 2)

- Hosting / CDN / Vercel — Phase 3.
- WordPress `<script>` URL swap — Phase 4.
- Lazy-loading or code-splitting the media players. Single-IIFE delivery is preserved.
- New filter dimensions, new view modes, design changes. Faithful port.
- `@perimeter/api-hooks` coverage for non-sermons endpoints. Only the sermons-related hooks land in Phase 2.
- Adding a `useConfig` hook to `@perimeter/widget-runtime`. Sermons drills `config` as a prop.

## Summary of decisions

| # | Decision |
|---|---|
| 1 | Faithful 1:1 port of legacy sermons (61 source files; ~30 `data-*` attrs; both tabs; all view + display modes) |
| 2 | Single IIFE delivery; per-widget budget raised to **500 KB gzipped** in the umbrella + Phase 1 + Phase 2 specs |
| 3 | Port every legacy test; hook tests relocate to `@perimeter/api-hooks` |
| 4 | Codegen API types from `perimeter-api/openapi/spec.yaml` via `openapi-typescript` into a new `@perimeter/api-types` package |
| 5 | New `@perimeter/api-hooks` package; sermons consumes its `useSermons`, `useSermonDetail`, etc. |
| 6 | Refactor sermons to drill `config` as a prop everywhere `useConfig()` was used |
| 7 | URL filter state via nuqs is preserved; prefix derived from the embed element id to avoid collisions between multiple embeds on one page (minor hardening over legacy) |
| 8 | Phase 2 ships locally only; WordPress keeps serving the legacy URL until Phase 4 |

## Architecture

### Packages

```
packages/
├── api-types/                   # NEW — codegen'd OpenAPI types
│   ├── package.json
│   ├── scripts/generate.ts      # reads ../../perimeter-api/openapi/spec.yaml
│   └── src/
│       ├── index.ts             # re-exports types
│       └── operations.ts        # GENERATED — do not edit
└── api-hooks/                   # NEW — typed React Query hooks
    ├── package.json
    └── src/
        ├── index.ts
        └── sermons/
            ├── use-sermons.ts          # list + facet params
            ├── use-sermon-detail.ts
            ├── use-series.ts
            ├── use-series-detail.ts
            ├── use-speakers.ts
            ├── use-books.ts
            ├── use-service-types.ts
            ├── use-series-types.ts
            └── use-sermon-facets.ts
```

### Widget

```
widgets/sermons/
├── package.json
├── tsconfig.json
├── vite.config.ts                  # perimeterWidget({ name: 'sermons' })
├── vitest.config.ts
├── postcss.config.js
├── tailwind.config.ts
└── src/
    ├── index.tsx                   # defineWidget(...)
    ├── App.tsx
    ├── types.ts                    # SermonsConfig zod schema (ported)
    ├── styles.css
    ├── components/
    │   ├── SermonTabs.tsx
    │   ├── sermons/                # SermonsView, SermonDetail, SermonGrid, SermonFilters, SermonInfo, SermonLargeList, SermonSmallList
    │   ├── series/                 # SeriesView, SeriesDetail, SeriesGrid
    │   ├── players/                # AudioPlayer, VideoPlayer (HLS), PdfViewer, MediaTabs
    │   └── ui/                     # DatePicker, DateRangePicker, Modal, MediaCard, ImagePlaceholder
    ├── hooks/                      # widget-internal hooks only
    │   ├── use-sermon-filters.ts   # nuqs URL state + config-pinned filters
    │   ├── use-media-player.ts
    │   └── use-filter-label-cache.ts
    └── lib/                        # format / pagination helpers (ported)
└── tests/                          # widget-internal tests (App, components, hooks, lib)
```

### Dependency graph

```
@perimeter/api-types         (codegen output only; no internal deps)

@perimeter/api-hooks         → @perimeter/api-types
                             → @perimeter/api-client      (uses useApiClient from runtime)
                             → @tanstack/react-query      (peer)

@perimeter/widget-sermons    → @perimeter/api-hooks
                             → @perimeter/api-types
                             → @perimeter/ui
                             → @perimeter/widget-runtime
                             → nuqs, framer-motion, hls.js, luxon, react-pdf,
                               @headlessui/react, lucide-react, zod
```

### Build-time codegen

A new root script `pnpm generate:api-types` runs:

```
openapi-typescript ../perimeter-api/openapi/spec.yaml -o packages/api-types/src/operations.ts
```

`operations.ts` is generated and committed. CI verifies sync by regenerating and diffing; PR fails if drift. The generator is not part of `pnpm quality` (a missing `perimeter-api` sibling repo shouldn't break quality), but it is part of `.github/workflows/ci.yml` as an extra step requiring the sibling repo to be present.

For Phase 2, since the perimeter-api sibling repo is a checkout-time concern, the CI step runs only if `../perimeter-api/openapi/spec.yaml` exists. PR-time drift detection is a forward-looking convention; the initial Phase 2 commit pre-generates the file.

## API hooks layer

Each hook in `@perimeter/api-hooks` is a thin typed wrapper around React Query + `useApiClient()`.

```ts
// packages/api-hooks/src/sermons/use-sermons.ts
import type { operations } from '@perimeter/api-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';

type Params = operations['listSermons']['parameters']['query'];
type Response = operations['listSermons']['responses']['200']['content']['application/json'];

export function useSermons(params: Params): UseQueryResult<Response> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['sermons', params],
    queryFn: async () => {
      const search = new URLSearchParams(params as Record<string, string>).toString();
      const res = await client.fetch(`/sermons?${search}`);
      if (!res.ok) throw new Error(`Sermons request failed: ${res.status}`);
      return (await res.json()) as Response;
    },
  });
}
```

Same shape for: `useSermonDetail`, `useSeries`, `useSeriesDetail`, `useSpeakers`, `useBooks`, `useServiceTypes`, `useSeriesTypes`, `useSermonFacets`. Each returns the standard `UseQueryResult<T>` so consumers handle `isLoading` / `error` / `data` uniformly. Operation names follow the perimeter-api OpenAPI `operationId` convention.

## Data flow

```
mountWidget()
  └─ parseDataAttrs(div, schema)         → SermonsConfig (zod-validated)
  └─ <App config={config} />             ← config is a prop
        └─ <SermonsWidget config>        ← drilled
              └─ useSermonFilters(config)        → URL-backed filters (nuqs)
              └─ <SermonTabs config onTabChange/>
              └─ Active view (from filters.screen + filters.tab):
                  ├─ <SermonsView config filters />
                  │       └─ useSermons(filters) → React Query
                  │       └─ useSermonFacets(filters) → React Query
                  │       └─ <SermonFilters config filters onChange />
                  │       └─ <SermonGrid sermons onSermonClick />   // or LargeList / SmallList
                  ├─ <SeriesView config />
                  │       └─ useSeries(...) → React Query
                  │       └─ <SeriesGrid series onSeriesClick />
                  ├─ <SermonDetail id config onBack onSermonClick />
                  │       └─ useSermonDetail(id)
                  │       └─ <SermonInfo /> + <MediaTabs />
                  │              └─ <AudioPlayer /> | <VideoPlayer /> | <PdfViewer />
                  └─ <SeriesDetail id config onBack onSermonClick />
                          └─ useSeriesDetail(id)
                          └─ <SermonGrid sermons />
```

Every component below `App` receives `config` as a prop. `useSermonFilters(config)` derives URL-backed state (via nuqs) and merges in config-pinned filter IDs (`data-series-id`, `data-speaker-id`, etc.). The hook returns the merged effective filters plus setters that only mutate the URL-state half.

## URL state via nuqs

Legacy uses `nuqs` to sync filter state to `window.location.search`. Same approach ports unchanged. The widget runs inside a shadow root but URL state is window-global, so two embeds on the same page would collide.

**Hardening:** `<NuqsAdapter>` is configured with a prefix derived from the embed element's `id` attribute. If the embed `<div id="perimeter-sermons-1">`, nuqs uses prefix `perimeter-sermons-1.` so multiple embeds don't fight. Legacy didn't do this (single embed assumed); we add the prefix during the port. Behavior is identical when only one embed exists (the prefix is just longer URL keys).

## Error & loading states

- React Query handles `isLoading` / `isError` per-hook. Loading renders the platform's `<Skeleton>` (Phase 1). Errors render an inline error card with "Try again" that re-fetches via React Query's `refetch`.
- The platform's `ErrorBoundary` (in `mountWidget`'s provider stack) catches uncaught render errors. Unchanged from Phase 1.
- Auth: `auth: 'none'`. Sermons is fully public; no `AuthGate` blocking.

## Bundle + delivery

- Per-widget budget raised to **500 KB gzipped**. The umbrella + Phase 1 specs are amended in the same Phase 2 commit; Phase 2's spec carries the same number for verifiability.
- Single-IIFE delivery contract preserved. `widgets/sermons/` uses `@perimeter/vite-plugin-widget` exactly like `widgets/example/`. Build emits `dist/sermons/sermons.iife.js`.
- No code-splitting changes to the plugin. If sermons cannot fit under 500 KB, Phase 2 surfaces the actual size and pauses for direction.
- No hosting work in Phase 2. The IIFE lives only in local `dist/` and is served by Studio's `/api/widget-bundles/[name]` route for verification.

## Testing strategy

Legacy had ~150 assertions across 18 test files (`widgets/sermons/src/__tests__/`).

| Test file | Source | Lands in |
|---|---|---|
| `tests/App.test.tsx` | legacy | `widgets/sermons/tests/` |
| `tests/components/SermonGrid.test.tsx` | legacy | `widgets/sermons/tests/components/` |
| `tests/components/SermonFilters.test.tsx` | legacy | `widgets/sermons/tests/components/` |
| `tests/components/PdfViewer.test.tsx` | legacy | `widgets/sermons/tests/components/players/` |
| `tests/hooks/use-sermons.test.tsx` | legacy → relocated | `packages/api-hooks/tests/sermons/` |
| `tests/hooks/use-sermon-detail.test.tsx` | relocated | `packages/api-hooks/tests/sermons/` |
| `tests/hooks/use-series.test.tsx` | relocated | `packages/api-hooks/tests/sermons/` |
| `tests/hooks/use-series-detail.test.tsx` | relocated | `packages/api-hooks/tests/sermons/` |
| `tests/hooks/use-speakers.test.tsx` | relocated | `packages/api-hooks/tests/sermons/` |
| `tests/hooks/use-books.test.tsx` | relocated | `packages/api-hooks/tests/sermons/` |
| `tests/hooks/use-service-types.test.tsx` | relocated | `packages/api-hooks/tests/sermons/` |
| `tests/hooks/use-series-types.test.tsx` | relocated | `packages/api-hooks/tests/sermons/` |
| `tests/hooks/use-sermon-facets.test.tsx` | relocated | `packages/api-hooks/tests/sermons/` |
| `tests/hooks/use-filter-label-cache.test.tsx` | legacy | `widgets/sermons/tests/hooks/` (widget-internal) |
| `tests/use-sermon-filters.test.tsx` | legacy | `widgets/sermons/tests/hooks/` |
| `tests/lib/format.test.ts` | legacy | `widgets/sermons/tests/lib/` |
| `tests/lib/pagination.test.ts` | legacy | `widgets/sermons/tests/lib/` |
| `tests/types.test.ts` | legacy | `widgets/sermons/tests/` (config schema) |
| `tests/bundle.test.ts` | NEW | `widgets/sermons/tests/` (size budget, version, `PerimeterWidgets` global) |

Mocking: hook tests mock `useApiClient` at the runtime context boundary; component tests render against the real provider stack with mock fetch responses. Bundle test follows the Phase 1 pattern (`gzipSync` size check + content asserts).

## Verification in Studio

- Add an entry to `apps/studio/src/lib/widgets-registry.ts` and `widget-definitions.ts`.
- No new Studio routes; `/widgets/sermons` works automatically via the `[slug]` dynamic route.
- Native + As-shipped modes both work. Theme overrides in `/theme` propagate to both (Phase 1 contract).

## Acceptance criteria

1. `pnpm install && pnpm quality` exits 0 from a clean checkout.
2. `pnpm --filter @perimeter/widget-sermons build` emits `dist/sermons/sermons.iife.js` **under 500 KB gzipped**.
3. `pnpm --filter @perimeter/widget-sermons test` runs the ported widget tests green.
4. `pnpm --filter @perimeter/api-hooks test` runs the relocated hook tests green.
5. Studio's `/widgets/sermons` page renders the widget in both Native and As-shipped modes. Tabs switch; filters apply; detail views open; media players (audio, video via HLS, PDF) render.
6. `/theme` edits update the rendered sermons widget live (Phase 1 contract carried).
7. `@perimeter/api-types` is in sync with `perimeter-api/openapi/spec.yaml` (CI regenerates and diffs when the sibling repo is present).
8. No production deploys in Phase 2. WordPress keeps serving the legacy URL.

## Risks

| Risk | Mitigation |
|---|---|
| Sermons bundle exceeds 500 KB | Fail loudly during the build. Pause for direction: raise budget, drop a dep, or escalate to code-splitting follow-up. |
| URL-state prefix collides with legacy WP behavior unexpectedly | Phase 2 only renders in Studio, not on WP. WP cutover (Phase 4) explicitly verifies URL behavior on real pages. |
| `openapi-typescript` codegen drifts from the API | CI regenerates and diffs; PR fails if out of sync. Pre-generated file is committed for environments without the sibling repo. |
| Behavioral differences from legacy slip through | Every ported test enforces legacy behavior. Visual smoke check in Studio. Anything that diverges is caught at test or at smoke. |
| The legacy widget creates its own React Query setup that conflicts with the runtime's `QueryProvider` | The runtime already provides a per-widget `QueryClient` (Phase 1). Sermons port must use the existing context; no `QueryClient` is created in widget code. Verify during the port. |
| `nuqs` requires the `<NuqsAdapter>` to live at the React tree root, but the runtime owns the tree root | `App` (the user component) is the right place to wrap children with `<NuqsAdapter>`. Adapter goes inside the user's tree, not the runtime's. Confirmed in legacy. |
| `react-pdf` requires a worker bundle that may not inline into the IIFE | Configure react-pdf's worker via `import.meta.url` or inline base64. Test in both Native and As-shipped Studio modes. |
| HLS.js may need polyfill for older Safari | Test on Safari during the Studio smoke pass. Native HLS on Safari is the fallback. |

## Out of scope (Phase 2)

- Hosting / CDN — Phase 3.
- WordPress `<script>` URL swap — Phase 4.
- Lazy-loading / code-splitting the media players.
- New filter dimensions, new view modes, design changes.
- `@perimeter/api-hooks` coverage for non-sermons endpoints.
- Adding a `useConfig` hook to the runtime.

## Open questions

None blocking. Two implementation-time decisions to confirm during the port:

1. **`react-pdf` worker URL** — inline as base64 in the bundle (simple, larger bundle) vs. fetched from a stable URL at runtime (smaller bundle, extra request). Default for Phase 2: inline as base64; revisit if bundle bloat becomes a problem.
2. **Date-range filter UX with Luxon vs. Intl.DateTimeFormat** — legacy uses Luxon throughout. Faithful port keeps Luxon. Future widget could swap for browser-native APIs but not in Phase 2.
