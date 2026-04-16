# Sermons Widget — Filter Cross-Filtering & Visual Polish

> **Date:** 2026-04-16
> **Status:** Draft
> **Scope:** Sermons widget filter behavior, card styling, dropdown styling; perimeter-api facets + search fix
> **Affects:** `perimeter-widgets/packages/widget-sermons`, `perimeter-widgets/packages/shared`, `perimeter-api/src/systems/mp/sermons`, plus controllers/services/routes

## Problem

Four issues with the sermons widget filter UX, plus one blocking API bug surfaced during investigation:

1. **Filter dropdowns don't cross-filter.** Selecting a speaker doesn't narrow the options shown in the series, book, service-type, or series-type dropdowns. A user can pick a speaker who never preached a given series, or a book that's never been paired with their speaker, and then see an empty result set.
2. **Filter dropdown trigger menus blend with the widget background in light mode.** The expanded popover uses a light `ring-1 ring-foreground/10` which disappears against the widget surface and makes it hard to distinguish the menu from the page behind it.
3. **Small-list sermon cards have no per-row border and a very subtle hover.** The Grid and Large-list views already have a bordered card with a strong hover (ring + shadow + translate), but Small-list just uses `hover:bg-muted/50` and a single divider between rows. Rows don't feel interactive.
4. **Filter pill badges render for locked/hidden filters.** When `data-speaker-id="5"` (locked) or `data-hide-speaker` is set, the speaker dropdown is hidden, but the active-filter chip for that speaker still renders and is still clickable — so an embedder who locks a filter still exposes a way for the user to remove it.
5. **API sermon search returns 502.** `GET /api/sermons?search=...` builds an OData `contains(Title, ...)` filter. MP translates that to the SQL `CONTAINS` full-text predicate, but `Pocket_Platform_Sermons` is not full-text indexed. Every search request fails with `MP_API_ERROR`. This blocks testing the filter changes end-to-end and is a pre-existing production bug.

## Goals

- Filter dropdowns in the sermons view narrow to only options present in the currently-filtered sermon set (including the free-text search term).
- Pills, dropdowns, and search controls are invisible and non-interactive when the corresponding filter is locked by config or hidden via `data-hide-*`.
- Dropdown popover menus are visibly separated from the widget background in light mode.
- All three sermon list views (Grid / Small list / Large list) give clear hover feedback.
- Sermon search works end-to-end against MP without requiring the table to be full-text indexed.

## Non-Goals

- No cross-filtering in the Series browse view. Its filter set is much smaller (seriesType + search + date range) and the user did not request it. Revisit later if needed.
- No changes to URL/nuqs schema. Query params stay as-is.
- No changes to widget `data-*` config surface. This spec consumes existing locks (`data-<filter>-id`, `data-hide-<filter>`); it does not add new ones.
- No admin/CMS/write endpoints on the sermons API.
- No move to MP full-text indexing. We use LIKE, matching the proven pattern already in `contacts-system.ts`.

---

## perimeter-api — Facets cross-filtering

Each facets endpoint gains optional cross-filter query params that mirror the sermon list filter set. Each endpoint returns only the dimension values present in the sermon subset matching those filters.

### Endpoints and new params

| Endpoint | Adds these query params (optional) |
| --- | --- |
| `GET /api/sermons/speakers` | `search`, `seriesId`, `bookId`, `congregationId`, `serviceTypeId`, `seriesTypeId`, `from`, `to` |
| `GET /api/sermons/books` | `search`, `seriesId`, `speakerId`, `congregationId`, `serviceTypeId`, `seriesTypeId`, `from`, `to` |
| `GET /api/sermons/service-types` | `search`, `seriesId`, `speakerId`, `bookId`, `congregationId`, `seriesTypeId`, `from`, `to` |
| `GET /api/sermons/series-types` | `search`, `seriesId`, `speakerId`, `bookId`, `congregationId`, `serviceTypeId`, `from`, `to` |
| `GET /api/sermons/series` | Adds `search` (new), `speakerId`, `bookId`, `congregationId`, `serviceTypeId` to the already-supported `seriesTypeId`, `from`, `to` |

Each endpoint never passes its own dimension as a cross-filter param (a speaker filter shouldn't self-filter the speakers endpoint). Comma-separated ID strings are used everywhere, consistent with the existing `seriesTypeId` convention.

### Implementation per facets endpoint

In `SermonsSystem`, each facets method (`listSpeakers`, `listBooks`, `listServiceTypes`, `listSeriesTypes`, and the updated series query path) performs this flow:

1. Build a sermon filter string via `buildSermonFilter(query)` — the same helper the sermon list uses, extended to accept the new cross-filter params.
2. Query `Pocket_Platform_Sermons` with that filter, selecting only the dimension FK column(s) (e.g. `Speaker_ID` for `/speakers`, `Book_ID` for `/books`). Use the existing 10K `top` ceiling from `getSermonCount`.
3. Collect the distinct set of non-null FK values.
4. Fetch the dimension table rows matching that set (e.g. `Pocket_Platform_Speakers?$filter=Speaker_ID IN (…)`). Use existing transformers.
5. Return as the current response shape — no shape change.

For `/api/sermons/series`, the existing series query already lists series with its own filters. Keep that query but narrow the result to series whose IDs appear in the filtered sermon set (the sermon filter constrains which series have matching sermons). This preserves the existing sort/paginate semantics; if page 1 of the narrowed set is smaller than `perPage`, pagination reflects the narrowed total.

When no cross-filter params are present, endpoints behave identically to today: they return the full dimension list (no sermon-filter pre-query). This keeps existing callers fast and unchanged, and keeps the cache keys simple (a single "no filters" entry per dimension).

### Caching

Cache keys for facets responses include a hash of the new cross-filter param set:

- `speakers:<filter-hash>`
- `books:<filter-hash>`
- `service-types:<filter-hash>`
- `series-types:<filter-hash>`

When the hash is empty (no cross-filter params), use the existing keys (`speakers:all`, etc.) so existing cache entries aren't invalidated.

TTLs unchanged.

### Data models

No changes to response models. `SermonsQuery` gains the new optional fields in `src/data/models/sermons/index.ts`, but each facets endpoint sees only the subset relevant to it (handled by Zod schemas on the route layer).

### Errors

If a cross-filter param is malformed (non-numeric ID, bad date), return 400 via the existing Zod validation layer. No custom error codes needed.

---

## perimeter-api — Search fix

### Current (broken)

In `sermons-system.ts:662-667` (inside `buildSermonFilter`):

```ts
if (query.search) {
    const escaped = query.search.replace(/'/g, "''");
    parts.push(
        `(contains(Title,'${escaped}') or contains(Short_Description,'${escaped}'))`,
    );
}
```

MP translates OData `contains()` to SQL `CONTAINS` (full-text predicate). `Pocket_Platform_Sermons` has no full-text index, so this always returns 500 from MP and surfaces as 502 from our proxy.

### Replacement

Use SQL `LIKE` predicates, matching the proven pattern already shipping in `contacts-system.ts` (lines 90, 432, 435, 450):

```ts
if (query.search) {
    const escaped = query.search
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "''")
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_')
        .replace(/\[/g, '\\[');
    parts.push(
        `(Title LIKE '%${escaped}%' ESCAPE '\\' OR Short_Description LIKE '%${escaped}%' ESCAPE '\\')`,
    );
}
```

The escape list prevents user input from acting as a LIKE pattern or injecting extra predicates:
- `\` must be doubled for the SQL string literal and escaped so it can itself act as the LIKE escape char.
- `'` is SQL single-quote escape (already handled).
- `%` and `_` are LIKE wildcards.
- `[` starts a character class in SQL Server LIKE.

`ESCAPE '\'` declares the escape character used for the previous four.

### Evidence the pattern works

`contacts-system.ts` has been shipping these exact LIKE predicates against MP's REST API in production:
- line 90: `Display_Name LIKE '%…%' OR First_Name LIKE '%…%' OR Last_Name LIKE '%…%'`
- line 432: `Email_Address LIKE '%${query}%'`
- line 450: `${fields.map(f => \`${f} LIKE '%${term}%'\`).join(' OR ')}`

MP accepts raw SQL predicates in `$filter`; it is not strict OData.

### Docs

Update `perimeter-api/docs/domains/sermons.md`:
- Line ~34 (search param description): "Text search via SQL `LIKE` on Title and Short_Description"
- Known Limitations: remove the `contains()` entry and its full-text constraint; optionally mention that search is a substring match.

### Series search

`/api/sermons/series` already supports `search`, implemented client-side in memory over the series list. No change needed there for the fix — but the new cross-filter `search` param on `/api/sermons/series` piggybacks the same sermon LIKE predicate when narrowing by sermon subset.

---

## perimeter-widgets — Facets wiring

### Hook signatures

Extend the facet hooks to accept the active filter set and forward it. Query keys include the filter set so TanStack Query refetches on filter change.

`use-speakers.ts`:
```ts
export interface UseSpeakersParams {
    search?: string;
    selectedSeriesIds?: number[];
    selectedBookIds?: number[];
    selectedServiceTypeIds?: number[];
    selectedSeriesTypeIds?: number[];
    from?: string;
    to?: string;
    config: SermonsConfig;
}
```

Same treatment for `use-books.ts`, `use-service-types.ts`, `use-series-types.ts`. The `use-series.ts` hook already accepts `search`, `selectedSeriesTypeIds`, `from`, `to` — extend it with `speakerId`, `bookId`, `serviceTypeId`.

Each hook serializes its filter arrays to comma-separated strings and omits its own dimension from the params (speakers hook doesn't forward `speakerId`).

Drop the hard-coded `staleTime: 10 * 60 * 1000` on speakers and `30 * 60 * 1000` on books. With cross-filter keys, each filter combination is its own cache entry, so stale-time freshness matters less; leave defaults.

### SermonsView plumbing

`SermonsView` passes the current filter state from `useSermonFilters` into every facet hook:

```tsx
const { data: speakers = [], isLoading: speakersLoading } = useSpeakers({
    search: filters.search || undefined,
    selectedSeriesIds: filters.selectedSeriesIds,
    selectedBookIds: filters.selectedBookIds,
    selectedServiceTypeIds: filters.selectedServiceTypeIds,
    selectedSeriesTypeIds: filters.selectedSeriesTypeIds,
    from: filters.from,
    to: filters.to,
    config,
});
```

Analogous calls for `useBooks`, `useServiceTypes`, `useSeriesTypes`, and the existing `useSeries` call gains the missing cross-filter params.

### Selected-option preservation in dropdowns

When facets narrow, a currently-selected option can fall out of its own dropdown's option list. That would cause the dropdown's trigger label to still show "Speakers (1)" while the dropdown itself is missing that speaker — confusing and it breaks the "uncheck to remove" flow.

Fix inside `SermonFilters.tsx`: when building each dropdown's options, union the facets response with the currently-selected items (using whatever label we have for them — cached from the last full facets response, falling back to the chip's ID if we don't). Implementation detail: keep a ref of "labels seen so far per dimension" so we can render labels for selected-but-dropped options; rebuild on each facets response.

Show these "re-added" options at the top of the list with no visual difference (they're still valid selections). If the dropdown supports grouping, put them under a small "Selected" group; otherwise leave them ungrouped and rely on the checkmark to communicate selection.

### Loading/disabled state

While a facets hook is re-fetching after a filter change, the affected dropdowns stay interactive (previous options remain visible) — don't disable them. Downshift's `isLoading` prop isn't used; we already pass a `disabled` prop only during the initial load.

---

## perimeter-widgets — Locked-filter pill suppression

In `SermonFilters.tsx`, wrap each chip-rendering block in the same `!lockedFilters.has(...)` guard that already gates the dropdown:

| Chip | Guard |
| --- | --- |
| `selectedSeriesIds.map(...)` | `!lockedFilters.has('series')` |
| `selectedSpeakerIds.map(...)` | `!lockedFilters.has('speaker')` |
| `selectedBookIds.map(...)` | `!lockedFilters.has('book')` |
| `selectedServiceTypeIds.map(...)` | `!lockedFilters.has('serviceTypes')` |
| `selectedSeriesTypeIds.map(...)` | `!lockedFilters.has('seriesType')` |
| `props.search && ...` (search chip) | `!lockedFilters.has('search')` |

This removes both the visual chip and the remove button handler. The underlying filter state still applies to the API query (the lock is there because the embedder wants it), but the user has no UI affordance to see or change it.

`hasActiveFilters` already excludes locked filters from the "Clear All" condition (see `use-sermon-filters.ts:199-207`). Existing behavior — no change needed.

---

## perimeter-widgets — Dropdown menu visual polish

Change in `packages/shared/src/components/ui/perimeter/multi-combobox.tsx`. The popover menu (line ~317):

Current:
```ts
'absolute z-50 mt-1 max-h-60 w-full min-w-[var(--trigger-width)] overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10'
```

Replace `ring-1 ring-foreground/10` with `border border-foreground/20`. Keep `shadow-md` and `bg-popover`. Apply the identical change in `combobox.tsx` (single-select variant) for consistency.

This changes the menu boundary from a very light inner-stroke ring to a more visible border, fixing the "blends with the widget background" issue in light mode. Dark-mode contrast stays acceptable because `/20` of the foreground token scales with the theme.

No trigger change — only the expanded menu.

---

## perimeter-widgets — Small-list card hover

In `packages/widget-sermons/src/components/ui/MediaCard.tsx`, the `viewMode === 'list'` branch (line ~186-213).

Current className on the card button:
```ts
'flex w-full items-center gap-3 px-1 py-2 text-left cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
```

New className:
```ts
'flex w-full items-center gap-3 px-1 py-2 text-left cursor-pointer border-b border-border transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
```

Changes: per-row `border-b border-border`, stronger `hover:bg-muted`.

In `SermonSmallList.tsx`, remove `divide-y divide-border` from the wrapper so the per-row border replaces (not doubles) the existing dividers.

Grid and Large-list branches unchanged — their existing `CARD_BASE` hover treatment is already fine.

---

## Testing

### perimeter-api

- **Unit (System layer):** Each facets method gets a test covering:
  - No cross-filter params → returns full dimension list.
  - Single cross-filter param → returns narrowed list.
  - Cross-filter with no matching sermons → returns empty list.
  - Sermon-filter includes the new `search` term and narrowing behaves correctly.
  - A facets method does not pass its own dimension as a cross-filter.
- **Unit (System layer) for search fix:** `buildSermonFilter` test matrix:
  - Plain search term → `LIKE '%term%'`.
  - Term containing `'`, `\`, `%`, `_`, `[` → all properly escaped.
  - Combined with other filters still produces a valid SQL filter string.
- **Unit (cache):** Cache keys for facets include the filter hash when present; use the legacy key when empty.
- **Integration:** One happy-path test per facets endpoint with MSW-mocked MP responses.
- Run `pnpm quality` in `perimeter-api` before PR.

### perimeter-widgets

- **Hook tests:** Each facets hook forwards all expected filter params; query key changes when any filter changes.
- **SermonFilters:** With `lockedFilters` containing each filter name, the corresponding dropdown and chip are both absent.
- **SermonFilters:** When facets narrow such that a currently-selected option drops from the fresh list, the dropdown still offers that option (selected-option preservation).
- **MediaCard:** `viewMode === 'list'` renders the per-row border and the stronger hover class.
- **MultiCombobox / Combobox:** Menu container has the new `border` class, not `ring-1`.
- Storybook visual check on the updated MultiCombobox (already has a story).
- Run `pnpm quality` in `perimeter-widgets` before PR.

### Manual

- Storyboard end-to-end: pick a speaker → verify series/book/service-type dropdowns narrow. Combine with a search term → verify narrowing applies on top of search. Clear speaker → dropdowns return to full list.
- Storyboard with `data-speaker-id="5"`: confirm the speaker chip does not render.
- Verify the 502 search error is gone against a local `perimeter-api` with `VITE_API_MODE=local`.

---

## Rollout

Both PRs target `dev`. Ship order:

1. `perimeter-api` PR first (new params are additive; existing behavior unchanged when params absent). Deploy to a previewable env or merge to `dev`.
2. `perimeter-widgets` PR second. The widget PR depends on the API PR's new params but degrades cleanly against an older API (requests with unknown query params are ignored by the existing route Zod schemas, which strip unknown params — facets just don't narrow, falling back to today's behavior). Confirm that stripping behavior against the real route schema before relying on it; if strict mode is used, widgets must not ship until the API PR is live.

Search fix lands with the API PR; this unblocks widget manual testing.

No data migration, no feature flag, no staged rollout needed.

---

## Open questions

- None blocking. If `hasActiveFilters` logic needs to react to the new cross-filter behavior (e.g. a "narrowed-to-empty" state for a dropdown), we'll handle it as part of implementation rather than spec it in advance.
