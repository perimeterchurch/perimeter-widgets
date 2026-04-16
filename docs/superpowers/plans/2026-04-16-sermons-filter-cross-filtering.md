# Sermons Filter Cross-Filtering Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make sermons widget filter dropdowns cross-filter each other, fix a 502 error in sermon search, hide pills for locked/hidden filters, give dropdown menus a visible border in light mode, and add per-row border + stronger hover to the small-list sermon card view.

**Architecture:** Two-repo change. `perimeter-api` gains cross-filter query params on five facets endpoints (`/speakers`, `/books`, `/service-types`, `/series-types`, `/series`) plus a `contains()` → `LIKE` search predicate fix. `perimeter-widgets` consumes the new params via extended hooks and a new label cache that preserves selected options when facets narrow, plus a handful of styling and pill-suppression tweaks.

**Tech Stack:** Next.js 16 App Router (perimeter-api), Vitest, Zod, Ministry Platform REST API, React 19 + TanStack Query + nuqs + Downshift (perimeter-widgets), MSW for hook tests, Tailwind CSS 4.

**Spec:** `perimeter-widgets/docs/superpowers/specs/2026-04-16-sermons-filter-cross-filtering-design.md`

---

## File Structure

### perimeter-api

**Modified:**
- `src/data/models/sermons/index.ts` — add `FacetQuerySchema` variants for each facets endpoint
- `src/systems/mp/sermons/sermons-system.ts` — LIKE search fix, `listSeries` bug fix, new private helpers for cross-filter narrowing, extended facet methods
- `src/services/sermons/sermons-service.ts` — thread facet query params to system
- `src/controllers/sermons/sermons-controller.ts` — thread facet query params to service
- `src/app/api/(public)/sermons/speakers/route.ts` — parse search params, validate with Zod
- `src/app/api/(public)/sermons/books/route.ts` — parse search params, validate with Zod
- `src/app/api/(public)/sermons/service-types/route.ts` — parse search params, validate with Zod
- `src/app/api/(public)/sermons/series-types/route.ts` — parse search params, validate with Zod
- `src/app/api/(public)/sermons/series/route.ts` — extend existing Zod with new params
- `docs/domains/sermons.md` — update search + known-limitations sections

**Created:**
- `tests/systems/mp/sermons/sermons-system.test.ts` — unit tests for `buildSermonFilter`, filter-hash canonicalization, listSpeakers/Books/ServiceTypes/SeriesTypes cross-filter paths, and the `listSeries` reassignment bug fix

### perimeter-widgets

**Modified:**
- `packages/widget-sermons/src/hooks/use-speakers.ts` — accept cross-filter params
- `packages/widget-sermons/src/hooks/use-books.ts` — accept cross-filter params
- `packages/widget-sermons/src/hooks/use-service-types.ts` — accept cross-filter params
- `packages/widget-sermons/src/hooks/use-series-types.ts` — accept cross-filter params
- `packages/widget-sermons/src/hooks/use-series.ts` — accept additional cross-filter params
- `packages/widget-sermons/src/components/sermons/SermonsView.tsx` — pass filter state into every facets hook, install label cache
- `packages/widget-sermons/src/components/sermons/SermonFilters.tsx` — consume label cache, gate pills and dropdowns via `lockedFilters`
- `packages/widget-sermons/src/components/sermons/SermonSmallList.tsx` — remove `divide-y`
- `packages/widget-sermons/src/components/ui/MediaCard.tsx` — list-mode className: per-row border + stronger hover
- `packages/shared/src/components/ui/perimeter/multi-combobox.tsx` — popover border
- `packages/shared/src/components/ui/perimeter/combobox.tsx` — popover border

**Created:**
- `packages/widget-sermons/src/hooks/use-filter-label-cache.ts` — ref-backed per-dimension label cache with mount-time unfiltered prime
- `packages/widget-sermons/src/__tests__/hooks/use-speakers.test.tsx` — hook forwards filter params
- `packages/widget-sermons/src/__tests__/hooks/use-books.test.tsx` — hook forwards filter params
- `packages/widget-sermons/src/__tests__/hooks/use-filter-label-cache.test.tsx` — cache preserves labels across filter changes
- `packages/widget-sermons/src/__tests__/components/SermonFilters.test.tsx` — pill suppression and dropdown gating (extend if exists, otherwise create)

---

## Rollout Plan

This plan produces **two PRs that must ship in order**:

1. **PR A (perimeter-api)** — Tasks 1–14 below. Ships first, target `dev`. Additive changes only (no behavior change when new params absent), so it can be deployed independently.
2. **PR B (perimeter-widgets)** — Tasks 15–28 below. Depends on PR A being deployed. Target `dev` in `perimeter-widgets`.

Feature branches:
- perimeter-api: `feat/sermons-facets-cross-filter`
- perimeter-widgets: `feat/sermons-filter-cross-filtering` (already created for the spec commit)

**Critical cross-repo dependency:** Widget types are generated from the API's OpenAPI spec and published as the `@perimeterchurch/api` npm package. After PR A merges, the API package must be rebuilt/published and the widget's dependency version bumped before widget-side typechecks pass. Tasks 21–23 cannot typecheck until this is done (see Task 20.5 below).

---

## Chunk 1: perimeter-api — search fix and listSeries bug

This chunk ships the minimum to unbreak sermon search and fix the existing series-search reassignment bug. It is self-contained and can merge ahead of the facets work if needed.

### Task 1: Switch to feature branch in perimeter-api

**Files:**
- n/a (git only)

- [ ] **Step 1: Confirm the repo is on `dev` with a clean tree**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-api
git status
git branch --show-current
```

Expected: `On branch dev`, `nothing to commit, working tree clean`.

- [ ] **Step 2: Create the feature branch**

```bash
git checkout -b feat/sermons-facets-cross-filter
```

Expected: `Switched to a new branch 'feat/sermons-facets-cross-filter'`.

### Task 2: Add failing test for LIKE-based sermon search

**Files:**
- Create: `tests/systems/mp/sermons/sermons-system.test.ts`

- [ ] **Step 1: Look at a reference test file to mirror its patterns**

Read `tests/providers/mp/clients/tables.test.ts` — note how it constructs a provider double and asserts on the filter string passed in.

- [ ] **Step 2: Write the failing test**

Create `tests/systems/mp/sermons/sermons-system.test.ts`. Use Vitest. Build a minimal test that instantiates `SermonsSystem` with fake dependencies (provider, cache, audit, filesSystem) and asserts that `listSermons({ search: "grace" })` causes the mock `provider.tables.list` to be called with a filter string containing `Title LIKE '%grace%'` and **not** `contains(`. Also cover single-quote escaping: search `"women's"` should produce `Title LIKE '%women''s%'`.

Keep the mocks minimal — stub `getSeriesMap`, `getSpeakerMap`, `getBookMap`, `getCongregationMap` to return empty Maps so transformation doesn't fail.

- [ ] **Step 3: Run the test to confirm it fails**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-api
pnpm test tests/systems/mp/sermons/sermons-system.test.ts
```

Expected: FAIL — assertion error showing the filter string contains `contains(` instead of `LIKE`.

### Task 3: Implement the LIKE search replacement

**Files:**
- Modify: `src/systems/mp/sermons/sermons-system.ts:662-667`

- [ ] **Step 1: Replace the `contains()` predicate with `LIKE`**

In `buildSermonFilter`, change:

```ts
if (query.search) {
    const escaped = query.search.replace(/'/g, "''");
    parts.push(
        `(contains(Title,'${escaped}') or contains(Short_Description,'${escaped}'))`,
    );
}
```

To:

```ts
if (query.search) {
    const escaped = query.search.replace(/'/g, "''");
    parts.push(
        `(Title LIKE '%${escaped}%' OR Short_Description LIKE '%${escaped}%')`,
    );
}
```

- [ ] **Step 2: Run the test to confirm it passes**

```bash
pnpm test tests/systems/mp/sermons/sermons-system.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run the full test suite to confirm nothing else broke**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/systems/mp/sermons/sermons-system.ts tests/systems/mp/sermons/sermons-system.test.ts
git commit -m "fix: replace OData contains() with SQL LIKE for sermon search

MP's REST API translates OData contains() to SQL CONTAINS (full-text),
which fails on Pocket_Platform_Sermons because the table lacks a
full-text index. Every search request returned 502. Switch to LIKE,
matching the pattern already shipping in contacts-system.ts."
```

### Task 4: Add failing test for listSeries reassignment bug

**Files:**
- Modify: `tests/systems/mp/sermons/sermons-system.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test: given `listSeries({ seriesTypeId: "1", search: "grace" })` where the underlying series list has entries where a seriesTypeId=1 entry matches "grace" and a seriesTypeId=2 entry also matches "grace", assert that the result only contains the seriesTypeId=1 entry.

Today's code at `sermons-system.ts:469` reassigns `filtered = allSeries.filter(...)` instead of `filtered = filtered.filter(...)`, so the search step throws away the earlier seriesType narrowing. The test should FAIL with the current code.

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm test tests/systems/mp/sermons/sermons-system.test.ts
```

Expected: FAIL — assertion shows both the type-1 and type-2 entries are returned because search re-sources from `allSeries`.

### Task 5: Fix the listSeries reassignment bug

**Files:**
- Modify: `src/systems/mp/sermons/sermons-system.ts:467-474`

- [ ] **Step 1: Change the reassignment source**

In `listSeries`, change:

```ts
if (search) {
    const lower = search.toLowerCase();
    filtered = allSeries.filter(
        (s) =>
            (s.displayTitle ?? s.title).toLowerCase().includes(lower)
            || (s.subtitle?.toLowerCase().includes(lower) ?? false),
    );
}
```

To:

```ts
if (search) {
    const lower = search.toLowerCase();
    filtered = filtered.filter(
        (s) =>
            (s.displayTitle ?? s.title).toLowerCase().includes(lower)
            || (s.subtitle?.toLowerCase().includes(lower) ?? false),
    );
}
```

Only the `allSeries` → `filtered` change.

- [ ] **Step 2: Run the test to confirm it passes**

```bash
pnpm test tests/systems/mp/sermons/sermons-system.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/systems/mp/sermons/sermons-system.ts tests/systems/mp/sermons/sermons-system.test.ts
git commit -m "fix: preserve earlier narrowing in listSeries search step

The search step re-sourced from allSeries, throwing away any
seriesTypeId / from / to narrowing applied earlier. Switch to
filtering the already-filtered set."
```

### Task 6: Manual E2E check against real MP (search fix)

**Files:**
- n/a (manual verification)

- [ ] **Step 1: Start the dev API**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-api
pnpm dev
```

- [ ] **Step 2: Hit the search endpoint with a benign term**

In another terminal:

```bash
curl -s "http://localhost:5500/api/sermons?search=grace&page=1&perPage=3" | head -c 500
```

Expected: JSON with `"success": true` and a `data.sermons` array. No 502, no `MP_API_ERROR`.

- [ ] **Step 3: Hit the search endpoint with tricky characters**

```bash
curl -s "http://localhost:5500/api/sermons?search=women%27s&page=1&perPage=3" | head -c 500
curl -s "http://localhost:5500/api/sermons?search=hope%25&page=1&perPage=3" | head -c 500
curl -s "http://localhost:5500/api/sermons?search=test_&page=1&perPage=3" | head -c 500
```

Expected: all return `"success": true`. No 500s from MP. The `%` and `_` inputs will act as LIKE wildcards (matching anything / one char) — this is the documented trade-off from the spec.

- [ ] **Step 4: Stop the dev server (Ctrl-C)**

---

## Chunk 2: perimeter-api — facets cross-filtering

This chunk adds cross-filter query params to the four facet endpoints plus `/series`. Narrowing is implemented via a sermon subquery whose filter includes the new params.

### Task 7: Add Zod schemas for facet queries

**Files:**
- Modify: `src/data/models/sermons/index.ts` (add after `SeriesQuerySchema`)

- [ ] **Step 1: Add `BaseFacetQueryShape` and per-dimension schemas**

After line 176 in `src/data/models/sermons/index.ts`, add:

```ts
// --- Facet Query Params (cross-filter narrowing) ---

/**
 * Shared field shapes for the cross-filter params accepted by facet endpoints.
 * Each facet endpoint omits its own dimension via a Zod .omit() below.
 */
const FacetBaseShape = {
    search: z.string().max(200).optional(),
    seriesId: z.string().optional(),
    speakerId: z.string().optional(),
    bookId: z.string().optional(),
    congregationId: z.coerce.number().int().positive().optional(),
    serviceTypeId: z.string().optional(),
    seriesTypeId: z.string().optional(),
    from: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
        .optional(),
    to: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
        .optional(),
};

export const SpeakersQuerySchema = z
    .object(FacetBaseShape)
    .omit({ speakerId: true });
export type SpeakersQuery = z.infer<typeof SpeakersQuerySchema>;

export const BooksQuerySchema = z
    .object(FacetBaseShape)
    .omit({ bookId: true });
export type BooksQuery = z.infer<typeof BooksQuerySchema>;

export const ServiceTypesQuerySchema = z
    .object(FacetBaseShape)
    .omit({ serviceTypeId: true });
export type ServiceTypesQuery = z.infer<typeof ServiceTypesQuerySchema>;

export const SeriesTypesQuerySchema = z
    .object(FacetBaseShape)
    .omit({ seriesTypeId: true });
export type SeriesTypesQuery = z.infer<typeof SeriesTypesQuerySchema>;
```

- [ ] **Step 2: Extend `SeriesQuerySchema` with cross-filter params**

Modify `SeriesQuerySchema` (around line 159–174) to add the four narrowing params. The full replacement:

```ts
export const SeriesQuerySchema = z.object({
    search: z.string().max(200).optional(),
    seriesTypeId: z.string().optional(),
    speakerId: z.string().optional(),
    bookId: z.string().optional(),
    congregationId: z.coerce.number().int().positive().optional(),
    serviceTypeId: z.string().optional(),
    from: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
        .optional(),
    to: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
        .optional(),
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(50).default(12),
    sort: z.enum(['date', 'title', 'count']).default('date'),
    order: z.enum(['asc', 'desc']).default('desc'),
});
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/models/sermons/index.ts
git commit -m "feat: add facet query schemas for sermon cross-filtering"
```

### Task 8: Add filter-hash canonicalization helper

**Files:**
- Modify: `src/systems/mp/sermons/sermons-system.ts`
- Modify: `tests/systems/mp/sermons/sermons-system.test.ts`

- [ ] **Step 1: Write the failing test**

Add a describe block `canonicalizeFacetFilter` to the system test file. Assert that two equivalent inputs hash to the same cache key — e.g. `{ speakerId: "2,1", seriesId: "" }` and `{ speakerId: "1,2" }` both produce the same canonical string. Assert that empty / whitespace / NaN / zero IDs are stripped.

Since the helper is private, test indirectly by spying on `cache.set` / `cache.get` key arguments from `listSpeakers` calls. Alternatively, export the helper as an internal for testing (prefix with `__`) and import it directly.

Recommended: export a standalone helper `canonicalizeFacetFilter` from `sermons-system.ts` so it can be tested directly.

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm test tests/systems/mp/sermons/sermons-system.test.ts
```

Expected: FAIL — helper doesn't exist.

- [ ] **Step 3: Implement the helper**

Add to `src/systems/mp/sermons/sermons-system.ts` (near the top, after imports):

```ts
/**
 * Canonicalize a facet cross-filter input into a stable cache-key string.
 * - Trims whitespace on every value.
 * - For comma-separated ID params, splits, coerces to integers, drops
 *   non-positive and NaN, sorts ascending, rejoins with comma.
 * - Omits params with undefined or empty values.
 * - Sorts the remaining keys alphabetically.
 *
 * Two equivalent inputs always produce the same output regardless of key
 * ordering, whitespace, or internal ID ordering.
 */
export function canonicalizeFacetFilter(
    input: Record<string, string | number | undefined>,
): string {
    const ID_FIELDS = new Set([
        'seriesId',
        'speakerId',
        'bookId',
        'serviceTypeId',
        'seriesTypeId',
    ]);

    const parts: string[] = [];
    const keys = Object.keys(input).sort();

    for (const key of keys) {
        const raw = input[key];
        if (raw === undefined || raw === null) continue;
        const str = String(raw).trim();
        if (str === '') continue;

        if (ID_FIELDS.has(key)) {
            const ids = str
                .split(',')
                .map((s) => Number(s.trim()))
                .filter((n) => Number.isInteger(n) && n > 0)
                .sort((a, b) => a - b);
            if (ids.length === 0) continue;
            parts.push(`${key}=${ids.join(',')}`);
        } else {
            parts.push(`${key}=${str}`);
        }
    }

    return parts.join('&');
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm test tests/systems/mp/sermons/sermons-system.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/mp/sermons/sermons-system.ts tests/systems/mp/sermons/sermons-system.test.ts
git commit -m "feat: add canonicalizeFacetFilter helper for facet cache keys"
```

### Task 9: Extend buildSermonFilter to translate seriesTypeId inline

**Files:**
- Modify: `src/systems/mp/sermons/sermons-system.ts`

- [ ] **Step 1: Read the current `listSermons` flow**

Read `src/systems/mp/sermons/sermons-system.ts` from the start of `listSermons` through `buildSermonFilter`. Note how `seriesTypeId` is currently translated upstream of `buildSermonFilter`. Each facet method will need the same translation.

- [ ] **Step 2: Add a private helper that merges seriesTypeId into seriesId**

Add to the system class:

```ts
/**
 * If the query includes a seriesTypeId, translate it to a list of Series_IDs
 * via getSeriesIdsByType and merge into the seriesId set. Returns a new
 * query object with seriesTypeId removed and seriesId updated. Used by
 * every facet method that accepts seriesTypeId as a cross-filter param.
 */
private async mergeSeriesTypeIntoSeriesId<
    T extends { seriesId?: string; seriesTypeId?: string },
>(query: T): Promise<Omit<T, 'seriesTypeId'>> {
    const { seriesTypeId, ...rest } = query;
    if (!seriesTypeId) return rest;

    const typeSeriesIds = await this.getSeriesIdsByType(seriesTypeId);
    if (typeSeriesIds.length === 0) {
        // seriesType constraint eliminates all series; produce an impossible
        // seriesId so the sermon filter returns zero rows.
        return { ...rest, seriesId: '-1' };
    }

    const existing = rest.seriesId ?
        rest.seriesId
            .split(',')
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isInteger(n) && n > 0)
    :   [];

    if (existing.length === 0) {
        return { ...rest, seriesId: typeSeriesIds.join(',') };
    }

    const typeSet = new Set(typeSeriesIds);
    const intersection = existing.filter((id) => typeSet.has(id));
    if (intersection.length === 0) {
        return { ...rest, seriesId: '-1' };
    }
    return { ...rest, seriesId: intersection.join(',') };
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/systems/mp/sermons/sermons-system.ts
git commit -m "feat: add mergeSeriesTypeIntoSeriesId helper for facet narrowing"
```

### Task 10: Extend listSpeakers with cross-filter narrowing

**Files:**
- Modify: `src/systems/mp/sermons/sermons-system.ts`
- Modify: `tests/systems/mp/sermons/sermons-system.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests:

1. `listSpeakers()` with no query returns the full speakers list (existing behavior).
2. `listSpeakers({ bookId: "22" })` calls `provider.tables.list('Pocket_Platform_Sermons', ...)` with a filter containing `Book_ID IN (22)`, then queries `Pocket_Platform_Speakers` with `Speaker_ID IN (...)` limited to speakers in the returned sermon set.
3. `listSpeakers({ speakerId: "5" })` — should NOT pass `speakerId` through to the sermon subquery (facet excludes its own dimension).
4. `listSpeakers({ seriesTypeId: "1" })` — the sermon subquery filter includes the series IDs translated from the seriesType.
5. Cache key uses the plain `speakers:all` when no filters are present, and `speakers:<hash>` when at least one filter is present.

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
pnpm test tests/systems/mp/sermons/sermons-system.test.ts
```

Expected: FAIL — current `listSpeakers` accepts no query.

- [ ] **Step 3: Extend listSpeakers**

Find the current `listSpeakers` method. Replace with:

```ts
async listSpeakers(query?: SpeakersQuery): Promise<Speaker[]> {
    const hasCrossFilter = query && canonicalizeFacetFilter(query) !== '';

    const cacheKey = hasCrossFilter ?
        this.buildCacheKey(
            'speakers',
            this.hashFilter(canonicalizeFacetFilter(query)),
        )
    :   this.buildCacheKey('speakers', 'all');

    const cached = await this.cache.get<Speaker[]>(cacheKey);
    if (cached) return cached;

    let speakerIds: number[] | null = null;

    if (hasCrossFilter) {
        // Sermon subquery to derive the speaker ID set
        const sermonQuery = await this.mergeSeriesTypeIntoSeriesId(query);
        // Drop speakerId — facets endpoints never self-filter
        const { speakerId: _drop, ...sermonFilterInput } = sermonQuery as
            SpeakersQuery & { speakerId?: string };
        const filter = this.buildSermonFilter(sermonFilterInput as SermonsQuery);
        const raw = await this.provider.tables.list('Pocket_Platform_Sermons', {
            filter,
            select: ['Speaker_ID'],
            top: 10000,
        });
        const ids = new Set<number>();
        for (const r of raw as { Speaker_ID?: number }[]) {
            if (r.Speaker_ID != null) ids.add(r.Speaker_ID);
        }
        if (ids.size === 0) {
            await this.cache.set(cacheKey, [], { ttl: 60 });
            return [];
        }
        speakerIds = Array.from(ids);
    }

    const filter = speakerIds ?
        `Speaker_ID IN (${speakerIds.join(',')})`
    :   undefined;
    const raw = await this.provider.tables.list(
        'Pocket_Platform_Speakers',
        filter ? { filter } : {},
    );
    const speakers = (raw as Record<string, unknown>[]).map(transformMPSpeaker);

    const ttl = hasCrossFilter ? 60 : 600; // 60s for narrowed, 10min for "all"
    await this.cache.set(cacheKey, speakers, { ttl });
    return speakers;
}
```

The `_drop` destructure for `speakerId` is defensive — `SpeakersQuery` is the `.omit({ speakerId: true })` shape so it's already missing at the type level, but if a caller passes through raw params this trims it before hitting `buildSermonFilter`.

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
pnpm test tests/systems/mp/sermons/sermons-system.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/mp/sermons/sermons-system.ts tests/systems/mp/sermons/sermons-system.test.ts
git commit -m "feat: add cross-filter narrowing to listSpeakers"
```

### Task 11a: Extend listBooks with cross-filter narrowing

**Files:**
- Modify: `src/systems/mp/sermons/sermons-system.ts`
- Modify: `tests/systems/mp/sermons/sermons-system.test.ts`

- [ ] **Step 1: Write the failing tests**

Same shape as Task 10 for books: baseline (no filter), cross-filter narrows via `Book_ID` projection, own-dimension (`bookId`) excluded, `seriesTypeId` translates via `mergeSeriesTypeIntoSeriesId`, cache keys toggle between `books:all` and `books:<hash>`.

- [ ] **Step 2: Extend listBooks**

Find the current `listBooks` (or equivalent — may be named `listReferencedBooks` given the cache key at line 74; confirm by reading the method). Use the Task 10 shape, substituting:
- Query type: `BooksQuery`
- Dropped dimension in destructure: `bookId`
- Projection column: `Book_ID`
- Dimension table: `Pocket_Platform_Bible_Books`, PK `Book_ID`
- Cache key prefix: `books`

Plain "all" TTL: reuse the existing TTL (30 min per spec / docs). Hashed TTL: 60 seconds.

- [ ] **Step 3: Run tests and commit**

```bash
pnpm test tests/systems/mp/sermons/sermons-system.test.ts
git add src/systems/mp/sermons/sermons-system.ts tests/systems/mp/sermons/sermons-system.test.ts
git commit -m "feat: add cross-filter narrowing to listBooks"
```

### Task 11b: Extend listServiceTypes with cross-filter narrowing

**Files:**
- Modify: `src/systems/mp/sermons/sermons-system.ts`
- Modify: `tests/systems/mp/sermons/sermons-system.test.ts`

- [ ] **Step 1: Write the failing tests**

Same shape as Task 11a. Dimension table: `Pocket_Platform_Service_Types`, PK `Service_Type_ID`, projection column on sermons: `Service_Type_ID`.

- [ ] **Step 2: Extend listServiceTypes**

Use the Task 10 shape, substituting:
- Query type: `ServiceTypesQuery`
- Dropped dimension: `serviceTypeId`
- Projection column: `Service_Type_ID`
- Dimension table: `Pocket_Platform_Service_Types`, PK `Service_Type_ID`
- Cache key prefix: `service-types`
- Plain TTL: 30 min. Hashed TTL: 60 seconds.

- [ ] **Step 3: Run tests and commit**

```bash
pnpm test tests/systems/mp/sermons/sermons-system.test.ts
git add src/systems/mp/sermons/sermons-system.ts tests/systems/mp/sermons/sermons-system.test.ts
git commit -m "feat: add cross-filter narrowing to listServiceTypes"
```

### Task 11c: Extend listSeriesTypes with cross-filter narrowing

**Files:**
- Modify: `src/systems/mp/sermons/sermons-system.ts`
- Modify: `tests/systems/mp/sermons/sermons-system.test.ts`

- [ ] **Step 0: Verify `getAllSeries` exists and returns the expected shape**

Read `sermons-system.ts` for a method that returns all series with their `seriesType` attached (the cache key `buildCacheKey('series', 'all')` at line 522 suggests such a method exists). Confirm the method name and return shape — it should return `SeriesListItem[]` where each item has a `seriesType: { id, name } | null`.

If the method is named differently (e.g. `getSeriesList` or similar), substitute the correct name in the code sketch below. If no such method exists, use the `getSeriesMap()` helper at line 195 as the first option, or add a minimal `getAllSeries` helper before proceeding.

- [ ] **Step 1: Note the two-join-away dimension**

`Pocket_Platform_Sermons` has no `Series_Type_ID` column — seriesType is a property of the Series, not the sermon. So the narrowing subquery for seriesTypes projects **distinct Series_IDs** from the sermon filter, then reads those series' `Sermon_Series_Type_ID` values.

Use the in-memory `getAllSeries()` cache (verified in Step 0) to avoid an extra MP roundtrip for the series→seriesType mapping.

- [ ] **Step 2: Write the failing tests**

Baseline: unfiltered returns the full series-types list. Narrowed: given `speakerId=5`, only series-types whose series have at least one sermon by speaker 5 appear. Cache keys toggle between `series-types:all` and `series-types:<hash>`.

- [ ] **Step 3: Extend listSeriesTypes**

Sketch:

```ts
async listSeriesTypes(query?: SeriesTypesQuery): Promise<SeriesType[]> {
    const hasCrossFilter = query && canonicalizeFacetFilter(query) !== '';

    const cacheKey = hasCrossFilter ?
        this.buildCacheKey(
            'series-types',
            this.hashFilter(canonicalizeFacetFilter(query)),
        )
    :   this.buildCacheKey('series-types', 'all');

    const cached = await this.cache.get<SeriesType[]>(cacheKey);
    if (cached) return cached;

    if (!hasCrossFilter) {
        const seriesTypes = await this.getSeriesTypes();
        await this.cache.set(cacheKey, seriesTypes, { ttl: 1800 });
        return seriesTypes;
    }

    // NOTE: no mergeSeriesTypeIntoSeriesId here — seriesTypeId is the
    // facet's own dimension and has already been omitted by SeriesTypesQuery.
    // Also don't forward seriesTypeId to the sermon filter.
    const sermonFilterInput = { ...query } as SermonsQuery;
    const filter = this.buildSermonFilter(sermonFilterInput);
    const raw = await this.provider.tables.list('Pocket_Platform_Sermons', {
        filter,
        select: ['Series_ID'],
        top: 10000,
    });
    const seriesIds = new Set<number>();
    for (const r of raw as { Series_ID?: number }[]) {
        if (r.Series_ID != null) seriesIds.add(r.Series_ID);
    }

    const allSeries = await this.getAllSeries();
    const typeIds = new Set<number>();
    for (const s of allSeries) {
        if (seriesIds.has(s.id) && s.seriesType) typeIds.add(s.seriesType.id);
    }

    const allTypes = await this.getSeriesTypes();
    const result = allTypes.filter((t) => typeIds.has(t.id));
    await this.cache.set(cacheKey, result, { ttl: 60 });
    return result;
}
```

- [ ] **Step 4: Run tests and commit**

```bash
pnpm test tests/systems/mp/sermons/sermons-system.test.ts
git add src/systems/mp/sermons/sermons-system.ts tests/systems/mp/sermons/sermons-system.test.ts
git commit -m "feat: add cross-filter narrowing to listSeriesTypes"
```

### Task 12: Extend listSeries with cross-filter narrowing

**Files:**
- Modify: `src/systems/mp/sermons/sermons-system.ts`
- Modify: `tests/systems/mp/sermons/sermons-system.test.ts`

- [ ] **Step 1: Write the failing tests**

Add:

1. `listSeries({ speakerId: "5" })` returns only series that have at least one sermon preached by speaker 5. Verify via the sermon subquery mock.
2. Narrowing happens before sort/paginate (total reflects narrowed set).
3. `seriesTypeId` and `search` still work alongside the new cross-filter params (no regression).

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
pnpm test tests/systems/mp/sermons/sermons-system.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Extend listSeries**

Modify `listSeries` in `sermons-system.ts`. Keep the existing in-memory filter chain (seriesTypeId, search, from, to). **After** the chain, if any of `speakerId`, `bookId`, `serviceTypeId`, `congregationId` are present, run a sermon subquery that selects distinct `Series_ID` matching those params and intersect. Apply the intersection before sort/paginate so the pagination total is correct.

**Design note:** Unlike the four facet methods, `listSeries` does NOT call `mergeSeriesTypeIntoSeriesId` for this subquery. `seriesTypeId` narrows the series dimension (handled upstream by the in-memory filter chain at lines 452-464); we don't need it inside the sermon subquery.

Code shape inside `listSeries`, after the existing filter chain and before the sort step:

```ts
// Cross-filter narrowing via sermon subquery
const { speakerId, bookId, serviceTypeId, congregationId } = query ?? {};
const hasCrossFilter = Boolean(
    speakerId || bookId || serviceTypeId || congregationId,
);
if (hasCrossFilter) {
    // buildSermonFilter only reads the fields present on its input — the
    // Partial cast is accurate because page/perPage/sort/order aren't
    // filter predicates and are not read here.
    const sermonFilter = this.buildSermonFilter({
        speakerId,
        bookId,
        serviceTypeId,
        congregationId,
    } as Partial<SermonsQuery> as SermonsQuery);
    const raw = await this.provider.tables.list('Pocket_Platform_Sermons', {
        filter: sermonFilter,
        select: ['Series_ID'],
        top: 10000,
    });
    const allowedSeriesIds = new Set<number>();
    for (const r of raw as { Series_ID?: number }[]) {
        if (r.Series_ID != null) allowedSeriesIds.add(r.Series_ID);
    }
    filtered = filtered.filter((s) => allowedSeriesIds.has(s.id));
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
pnpm test tests/systems/mp/sermons/sermons-system.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/mp/sermons/sermons-system.ts tests/systems/mp/sermons/sermons-system.test.ts
git commit -m "feat: add cross-filter narrowing to listSeries"
```

### Task 13: Thread facet queries through service + controller + routes

**Files:**
- Modify: `src/services/sermons/sermons-service.ts`
- Modify: `src/controllers/sermons/sermons-controller.ts`
- Modify: `src/app/api/(public)/sermons/speakers/route.ts`
- Modify: `src/app/api/(public)/sermons/books/route.ts`
- Modify: `src/app/api/(public)/sermons/service-types/route.ts`
- Modify: `src/app/api/(public)/sermons/series-types/route.ts`
- Modify: `src/app/api/(public)/sermons/series/route.ts`

**Validation location:** The existing `/series` route calls `SeriesQuerySchema.parse(...)` **inside the route handler** and passes the already-parsed object to the controller (see `src/app/api/(public)/sermons/series/route.ts`). Controllers accept the already-typed query object — they do NOT re-validate. Mirror that pattern exactly: Zod parsing lives at the route, the controller method signature takes the parsed type.

- [ ] **Step 1: Extend the service and controller method signatures**

In `sermons-service.ts`, each of `listSpeakers`, `listBooks`, `listServiceTypes`, `listSeriesTypes` now accepts an optional query argument (typed with the matching Zod-inferred type: `SpeakersQuery`, `BooksQuery`, etc.) and forwards it to the system.

In `sermons-controller.ts`, each method accepts the same optional query typed parameter and forwards to the service. No Zod parsing inside the controller — that's the route's job. The controller follows the pattern at `sermons-controller.ts:24` (`async listSeries(params?: SeriesQuery)`).

- [ ] **Step 2: Update each facets route to parse query params with the matching schema**

For each of `/speakers`, `/books`, `/service-types`, `/series-types`, mirror the `/series` route pattern at `src/app/api/(public)/sermons/series/route.ts`:

```ts
// Example for /speakers
import { SpeakersQuerySchema } from '@data/models/sermons';
// ... other existing imports

export const GET = wrapHandler(
    withRateLimit(async (req) => {
        const { searchParams } = new URL(req.url);

        const params = SpeakersQuerySchema.parse({
            search: searchParams.get('search') || undefined,
            seriesId: searchParams.get('seriesId') || undefined,
            bookId: searchParams.get('bookId') || undefined,
            congregationId: searchParams.get('congregationId') || undefined,
            serviceTypeId: searchParams.get('serviceTypeId') || undefined,
            seriesTypeId: searchParams.get('seriesTypeId') || undefined,
            from: searchParams.get('from') || undefined,
            to: searchParams.get('to') || undefined,
        });

        const container = DIContainer.getInstance();
        const controller = container.get(SermonsController);
        const response = await controller.listSpeakers(params);

        return NextResponse.json(response);
    }, RateLimitPresets.relaxed),
);
```

Each route omits its facet's own dimension from both the read and the schema (the schema already omits it via `.omit({ speakerId: true })` etc., so unwanted keys passed to `.parse()` get stripped). Don't read `speakerId` in the `/speakers` route, don't read `bookId` in `/books`, etc.

- [ ] **Step 3: Update the `/series` route**

Add `speakerId`, `bookId`, `serviceTypeId`, `congregationId` reads to the existing `SeriesQuerySchema.parse({...})` call. The updated schema (Task 7) already accepts them.

- [ ] **Step 4: Typecheck + lint**

```bash
pnpm typecheck
pnpm lint
```

Expected: both pass.

- [ ] **Step 5: Run the test suite**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/services src/controllers "src/app/api/(public)/sermons"
git commit -m "feat: thread facet query params through service, controller, routes"
```

### Task 14: Update sermons domain docs and run quality

**Files:**
- Modify: `docs/domains/sermons.md`

- [ ] **Step 1: Update the docs**

In `docs/domains/sermons.md`:

- Update the search row in "Query Parameters / GET /api/sermons" (around line 34) to say: `Text search via SQL LIKE on Title and Short_Description. Matches substrings; a user-entered % or _ acts as a wildcard.`
- In "Known Limitations" (around line 301), replace the `contains()` full-text entry with: `Text search: SQL LIKE-based substring match on Title and Short_Description. Not full-text indexed; very long search terms may be slow.`
- Add a new subsection under "Query Parameters" documenting the new cross-filter params on `/speakers`, `/books`, `/service-types`, `/series-types` — one table per endpoint listing the accepted params. Mirror the style of the existing `/sermons` param table.
- Add one sentence under "Caching Strategy" noting that hashed-variant facet cache entries use a 60s TTL (vs 10/30 min for the unfiltered entries).
- Update the "Last verified" date at the top to today: `2026-04-16`.

- [ ] **Step 2: Run quality**

```bash
pnpm quality
```

Expected: PASS on typecheck, lint, format, test.

- [ ] **Step 3: Commit**

```bash
git add docs/domains/sermons.md
git commit -m "docs: update sermons domain docs for cross-filter params and LIKE search"
```

### Task 15: Manual E2E check against real MP (facets narrowing)

**Files:**
- n/a

- [ ] **Step 1: Start the dev API**

```bash
pnpm dev
```

- [ ] **Step 2: Exercise each facet endpoint unfiltered**

```bash
curl -s "http://localhost:5500/api/sermons/speakers" | head -c 500
curl -s "http://localhost:5500/api/sermons/books" | head -c 500
curl -s "http://localhost:5500/api/sermons/service-types" | head -c 500
curl -s "http://localhost:5500/api/sermons/series-types" | head -c 500
curl -s "http://localhost:5500/api/sermons/series?page=1&perPage=3" | head -c 500
```

Expected: all return `"success": true` with data arrays.

- [ ] **Step 3: Exercise each facet endpoint with a cross-filter**

Pick a speakerId that exists (grab one from the unfiltered `/speakers` response). Then:

```bash
# Books that appear in sermons by speaker X
curl -s "http://localhost:5500/api/sermons/books?speakerId=7" | head -c 500

# Series that have sermons by speaker X (narrowed)
curl -s "http://localhost:5500/api/sermons/series?speakerId=7&page=1&perPage=3" | head -c 500

# Speakers that appear in sermons for book Y
curl -s "http://localhost:5500/api/sermons/speakers?bookId=22" | head -c 500
```

Expected: narrowed lists vs unfiltered. Compare counts to sanity-check the narrowing is working.

- [ ] **Step 4: Stop the dev server**

### Task 16: Open PR A (perimeter-api)

**Files:**
- n/a

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/sermons-facets-cross-filter
```

- [ ] **Step 2: Write PR body to a temp file**

Write a PR body covering: LIKE search fix (what/why), listSeries bug fix, facets cross-filtering overview, new cache keys + TTLs, docs updated, testing performed. Include a Test plan checklist: unit tests, manual E2E search, manual E2E facets. Use the Write tool to write the body to `.tmp/pr-body-api.md`.

- [ ] **Step 3: Create the PR**

```bash
gh pr create --base dev --title "feat: cross-filter sermons facets and fix LIKE search" --body-file .tmp/pr-body-api.md
```

Return the PR URL to the user.

---

## Chunk 3: perimeter-widgets — visual polish (independent of API PR)

This chunk is small and doesn't depend on the API changes. It can be merged in either order.

### Task 17: Switch to feature branch in perimeter-widgets

**Files:**
- n/a

- [ ] **Step 1: Confirm the branch**

The branch `feat/sermons-filter-cross-filtering` was created when the spec was committed. Confirm:

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
git branch --show-current
```

Expected: `feat/sermons-filter-cross-filtering`.

### Task 18: Dropdown popover border (multi-combobox + combobox)

**Files:**
- Modify: `packages/shared/src/components/ui/perimeter/multi-combobox.tsx:317`
- Modify: `packages/shared/src/components/ui/perimeter/combobox.tsx`

- [ ] **Step 1: Change the multi-combobox popover class**

In `multi-combobox.tsx`, find the popover `ul` className (line ~317). Replace `ring-1 ring-foreground/10` with `border border-foreground/20`. Keep everything else.

Before:
```ts
'absolute z-50 mt-1 max-h-60 w-full min-w-[var(--trigger-width)] overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10'
```

After:
```ts
'absolute z-50 mt-1 max-h-60 w-full min-w-[var(--trigger-width)] overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md border border-foreground/20'
```

- [ ] **Step 2: Apply the same change in combobox.tsx**

In `combobox.tsx` (the single-select variant), find the equivalent popover className and make the same substitution.

- [ ] **Step 3: Run the shared package tests and typecheck**

```bash
pnpm test --filter=@perimeter-widgets/shared
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Manual visual check**

```bash
pnpm storybook
```

Navigate to the MultiCombobox story and the Combobox story. Open the dropdown in light mode. Confirm the popover now has a visible border against the storybook canvas.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/components/ui/perimeter/multi-combobox.tsx packages/shared/src/components/ui/perimeter/combobox.tsx
git commit -m "fix: give combobox popovers a visible border in light mode"
```

### Task 19: Small-list card hover and per-row border

**Files:**
- Modify: `packages/widget-sermons/src/components/ui/MediaCard.tsx:188-213`
- Modify: `packages/widget-sermons/src/components/sermons/SermonSmallList.tsx`

- [ ] **Step 1: Update the list-mode className**

In `MediaCard.tsx`, find the `viewMode === 'list'` branch. Replace the `CardButton`'s className:

Before:
```ts
className='flex w-full items-center gap-3 px-1 py-2 text-left cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
```

After:
```ts
className='flex w-full items-center gap-3 px-1 py-2 text-left cursor-pointer border-b border-border last:border-b-0 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
```

- [ ] **Step 2: Remove `divide-y` from the wrapper**

In `SermonSmallList.tsx`, change the outer `<div>` from `<div className='divide-y divide-border'>` to `<div>`. The per-row border on each card now replaces the wrapper dividers.

- [ ] **Step 3: Run widget tests**

```bash
pnpm test --filter=widget-sermons
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Manual visual check**

```bash
pnpm dev
```

Open the storyboard. Switch the sermons widget to Small list view. Confirm:
- Each row has a bottom border
- The final row does NOT have a bottom border
- Hovering a row shows a noticeably darker background than before

- [ ] **Step 5: Commit**

```bash
git add packages/widget-sermons/src/components/ui/MediaCard.tsx packages/widget-sermons/src/components/sermons/SermonSmallList.tsx
git commit -m "feat: add per-row border and stronger hover to small-list sermon cards"
```

---

## Chunk 4: perimeter-widgets — locked-filter pill suppression

### Task 20: Suppress pill badges and dropdowns for locked filters

**Files:**
- Modify: `packages/widget-sermons/src/components/sermons/SermonFilters.tsx`
- Create or Modify: `packages/widget-sermons/src/__tests__/components/SermonFilters.test.tsx`

- [ ] **Step 1: Write failing tests for pill suppression**

Check if `SermonFilters.test.tsx` exists. If not, create it in `packages/widget-sermons/src/__tests__/components/`.

Add tests:

1. Given `lockedFilters` contains `'speaker'` and `selectedSpeakerIds=[5]`, the rendered output contains no `button[aria-label^="Remove"]` referencing a speaker.
2. Given `lockedFilters` contains `'series'` and `selectedSeriesIds=[1]`, no series chip renders.
3. Given `lockedFilters` contains `'serviceTypes'` but `showServiceTypeFilter=true`, the service-types dropdown does NOT render (hidden wins).
4. Unlocked filters still render chips and dropdowns.

Use `@testing-library/react` and render `SermonFilters` directly with props. Stub `seriesList`, `speakers`, `books`, `serviceTypes`, `seriesTypes` with minimal fixtures.

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
pnpm test --filter=widget-sermons -- SermonFilters
```

Expected: FAIL.

- [ ] **Step 3: Wrap each chip-rendering block with a lockedFilters guard**

In `SermonFilters.tsx`, the active filter chips section (around line 260–384). For each chip array, wrap in the matching guard:

```tsx
{!props.lockedFilters.has('series') && props.selectedSeriesIds.map((id) => ( /* ... */ ))}
{!props.lockedFilters.has('speaker') && props.selectedSpeakerIds.map((id) => ( /* ... */ ))}
{!props.lockedFilters.has('book') && props.selectedBookIds.map((id) => ( /* ... */ ))}
{!props.lockedFilters.has('serviceTypes') && props.selectedServiceTypeIds.map((id) => ( /* ... */ ))}
{!props.lockedFilters.has('seriesType') && props.selectedSeriesTypeIds.map((id) => ( /* ... */ ))}
{!props.lockedFilters.has('search') && props.search && ( /* search chip */ )}
```

- [ ] **Step 4: Harmonize dropdown gating for service-types and series-types**

Change the two conditions around lines 188 and 206:

```tsx
// Before
{props.showServiceTypeFilter && ( /* dropdown */ )}
{props.showSeriesTypeFilter && ( /* dropdown */ )}

// After
{!props.lockedFilters.has('serviceTypes') && props.showServiceTypeFilter && ( /* dropdown */ )}
{!props.lockedFilters.has('seriesType') && props.showSeriesTypeFilter && ( /* dropdown */ )}
```

Also update the outer Row 2 condition (line 121–125) so it still wraps the row correctly when both dropdowns are locked-hidden.

- [ ] **Step 5: Run the tests to confirm they pass**

```bash
pnpm test --filter=widget-sermons -- SermonFilters
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/widget-sermons/src/components/sermons/SermonFilters.tsx packages/widget-sermons/src/__tests__/components/SermonFilters.test.tsx
git commit -m "feat: suppress pills and dropdowns for locked sermon filters"
```

---

## Chunk 5: perimeter-widgets — facets hooks and label cache

This chunk depends on PR A being deployed and the `@perimeterchurch/api` npm package being bumped (see Task 20.5). Do not merge this chunk until the API changes are live.

### Task 20.5: Bump @perimeterchurch/api dependency after PR A publishes

**Files:**
- Modify: `packages/shared/package.json`
- Modify: `pnpm-lock.yaml`

**Prerequisites:** PR A must be merged to `dev` in perimeter-api AND the `@perimeterchurch/api` package must be published to the npm registry with the new query params. Coordinate with the developer before starting this task.

- [ ] **Step 1: Identify the latest @perimeterchurch/api version that includes the new facet query params**

Check the published versions:

```bash
npm view @perimeterchurch/api versions --json | tail -20
```

Confirm with the developer which version contains the new params (it will be the one published after PR A merges). Record the version.

- [ ] **Step 2: Bump the dependency in the shared package**

Edit `packages/shared/package.json`, update the `@perimeterchurch/api` version to the one identified in Step 1 (e.g. `"@perimeterchurch/api": "^0.5.0"`).

- [ ] **Step 3: Update the lockfile**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
pnpm install
```

Expected: `pnpm-lock.yaml` updated.

- [ ] **Step 4: Verify the generated types include the new params**

Open `node_modules/@perimeterchurch/api/dist/index.d.ts` (or equivalent) and confirm the `/api/sermons/speakers` operation type's `parameters.query` includes `search`, `seriesId`, `bookId`, etc. A `grep` works:

```bash
grep -A 20 "sermons/speakers" node_modules/@perimeterchurch/api/dist/index.d.ts | head -40
```

Expected: the query object type lists the new fields.

- [ ] **Step 5: Typecheck**

```bash
pnpm typecheck
```

Expected: still passes (the hooks don't use the new types yet, but typecheck should still be green).

- [ ] **Step 6: Commit**

```bash
git add packages/shared/package.json pnpm-lock.yaml
git commit -m "chore: bump @perimeterchurch/api for sermons facet params"
```

### Task 21: Extend useSpeakers with cross-filter params

**Files:**
- Modify: `packages/widget-sermons/src/hooks/use-speakers.ts`
- Create: `packages/widget-sermons/src/__tests__/hooks/use-speakers.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `use-speakers.test.tsx` mirroring `use-sermons.test.tsx` structure (MSW-based). Test:

1. `useSpeakers({ config })` — no filter params — GET request goes to `/api/sermons/speakers` with no query string.
2. `useSpeakers({ config, selectedSeriesIds: [1, 2] })` — request query includes `seriesId=1,2`.
3. `useSpeakers({ config, search: "grace" })` — request query includes `search=grace`.
4. Two calls with the same filters share a cache entry (same queryKey).
5. The hook does NOT pass `speakerId` (its own dimension).

Use MSW's `onUnhandledRequest` to capture the actual URL.

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm test --filter=widget-sermons -- use-speakers
```

Expected: FAIL — new signature not implemented.

- [ ] **Step 3: Update the hook signature**

Replace `use-speakers.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { createApiClient, createApiError } from '@perimeter-widgets/shared';
import type { SermonsConfig } from '../types';

export interface UseSpeakersParams {
    config: SermonsConfig;
    search?: string;
    selectedSeriesIds?: number[];
    selectedBookIds?: number[];
    selectedServiceTypeIds?: number[];
    selectedSeriesTypeIds?: number[];
    from?: string;
    to?: string;
}

export function useSpeakers(params: UseSpeakersParams) {
    const {
        config,
        search,
        selectedSeriesIds = [],
        selectedBookIds = [],
        selectedServiceTypeIds = [],
        selectedSeriesTypeIds = [],
        from,
        to,
    } = params;

    const seriesId =
        selectedSeriesIds.length > 0 ? selectedSeriesIds.join(',') : undefined;
    const bookId =
        selectedBookIds.length > 0 ? selectedBookIds.join(',') : undefined;
    const serviceTypeId =
        selectedServiceTypeIds.length > 0
            ? selectedServiceTypeIds.join(',')
            : undefined;
    const seriesTypeId =
        selectedSeriesTypeIds.length > 0
            ? selectedSeriesTypeIds.join(',')
            : undefined;

    return useQuery({
        queryKey: [
            'speakers',
            config.apiUrl,
            { search, seriesId, bookId, serviceTypeId, seriesTypeId, from, to },
        ],
        queryFn: async () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            const { data, error } = await client.GET(
                '/api/sermons/speakers',
                {
                    params: {
                        query: {
                            search: search || undefined,
                            seriesId,
                            bookId,
                            serviceTypeId,
                            seriesTypeId,
                            from: from || undefined,
                            to: to || undefined,
                        },
                    },
                },
            );
            if (error) throw createApiError('Failed to fetch speakers', error);
            return data.data;
        },
    });
}
```

This step assumes Task 20.5 (bumping `@perimeterchurch/api`) has been completed so the generated types include the new query params. If typecheck fails with "property 'seriesId' does not exist on type 'query'," the `@perimeterchurch/api` dependency isn't bumped yet — go back to Task 20.5.

- [ ] **Step 4: Update all callers of useSpeakers**

The only caller today is `SermonsView.tsx`. It passes `config` directly. The new signature requires an object — update the call site:

Before:
```ts
const { data: speakers = [], isLoading: speakersLoading } = useSpeakers(config);
```

After (baseline — no filters wired yet, Task 26 will wire them):
```ts
const { data: speakers = [], isLoading: speakersLoading } = useSpeakers({ config });
```

- [ ] **Step 5: Run the tests**

```bash
pnpm test --filter=widget-sermons -- use-speakers
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/widget-sermons/src/hooks/use-speakers.ts packages/widget-sermons/src/__tests__/hooks/use-speakers.test.tsx packages/widget-sermons/src/components/sermons/SermonsView.tsx
git commit -m "feat: extend useSpeakers with cross-filter params"
```

### Task 22: Extend useBooks, useServiceTypes, useSeriesTypes

**Files:**
- Modify: `packages/widget-sermons/src/hooks/use-books.ts`
- Modify: `packages/widget-sermons/src/hooks/use-service-types.ts`
- Modify: `packages/widget-sermons/src/hooks/use-series-types.ts`
- Create: `packages/widget-sermons/src/__tests__/hooks/use-books.test.tsx`

- [ ] **Step 1: Apply the same pattern as useSpeakers**

Each hook takes a params object with `config` + the relevant cross-filter fields (omitting its own dimension). Query key includes `config.apiUrl` and the filter object. Serialize ID arrays to comma-separated strings.

- [ ] **Step 2: Write one full test suite for useBooks (mirror use-speakers.test.tsx)**

The other two hooks are tight mirrors of useBooks — a full test suite for useBooks plus a typecheck pass is sufficient coverage without duplicating the same tests three times.

- [ ] **Step 3: Update callers in SermonsView.tsx**

Update the calls to pass `{ config }` (baseline, filters wired in Task 26).

- [ ] **Step 4: Run the tests and typecheck**

```bash
pnpm test --filter=widget-sermons
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/widget-sermons/src/hooks/use-books.ts packages/widget-sermons/src/hooks/use-service-types.ts packages/widget-sermons/src/hooks/use-series-types.ts packages/widget-sermons/src/__tests__/hooks/use-books.test.tsx packages/widget-sermons/src/components/sermons/SermonsView.tsx
git commit -m "feat: extend useBooks/useServiceTypes/useSeriesTypes with cross-filter params"
```

### Task 23: Extend useSeries with cross-filter params

**Files:**
- Modify: `packages/widget-sermons/src/hooks/use-series.ts`

- [ ] **Step 1: Extend `UseSeriesParams` and update the body**

Add four fields to `UseSeriesParams`: `selectedSpeakerIds?`, `selectedBookIds?`, `selectedServiceTypeIds?` (plus the already-present `selectedSeriesTypeIds`). Destructure them in the hook body with defaults `= []`. Serialize each to a comma-separated string, matching the existing `seriesTypeId` treatment:

```ts
const speakerId =
    selectedSpeakerIds.length > 0 ? selectedSpeakerIds.join(',') : undefined;
const bookId =
    selectedBookIds.length > 0 ? selectedBookIds.join(',') : undefined;
const serviceTypeId =
    selectedServiceTypeIds.length > 0
        ? selectedServiceTypeIds.join(',')
        : undefined;
```

Include the serialized strings in the queryKey's object and in the `params.query` passed to `client.GET('/api/sermons/series', ...)`. Add `config.apiUrl` to the queryKey array. Final queryKey shape:

```ts
queryKey: [
    'series-list',
    config.apiUrl,
    {
        search,
        seriesTypeId,
        speakerId,
        bookId,
        serviceTypeId,
        from,
        to,
        page,
        perPage,
        sort,
        order,
    },
]
```

And the `params.query`:

```ts
params: {
    query: {
        search: search || undefined,
        seriesTypeId,
        speakerId,
        bookId,
        serviceTypeId,
        from: from || undefined,
        to: to || undefined,
        page,
        perPage,
        sort,
        order,
    },
}
```

- [ ] **Step 2: Update or add use-series test**

Add a minimal test that calls `useSeries({ config, selectedSpeakerIds: [7] })` and asserts the outgoing request URL contains `speakerId=7`. Follow the MSW pattern from `use-sermons.test.tsx`.

- [ ] **Step 3: Run tests and typecheck**

```bash
pnpm test --filter=widget-sermons
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/widget-sermons/src/hooks/use-series.ts packages/widget-sermons/src/__tests__
git commit -m "feat: extend useSeries with speaker/book/serviceType cross-filter params"
```

### Task 24: Create useFilterLabelCache hook

**Files:**
- Create: `packages/widget-sermons/src/hooks/use-filter-label-cache.ts`
- Create: `packages/widget-sermons/src/__tests__/hooks/use-filter-label-cache.test.tsx`

- [ ] **Step 1: Design the API**

```ts
export interface FilterLabelCache {
    /** Look up a cached label for a dimension's ID. Returns undefined if unseen. */
    getLabel(dimension: Dimension, id: number): string | undefined;
    /** Update the cache with fresh facets responses. Called on every render. */
    absorb(
        dimension: Dimension,
        options: { id: number; label: string }[],
    ): void;
    /**
     * Given the narrowed options for a dimension and the currently selected IDs,
     * produce the final option list shown in the dropdown: narrowed options first
     * (in original order), followed by any selected-but-missing options rehydrated
     * from the label cache.
     */
    mergeSelectedIntoOptions(
        dimension: Dimension,
        narrowedOptions: { value: string; label: string }[],
        selectedIds: number[],
    ): { value: string; label: string }[];
}

export type Dimension =
    | 'speaker'
    | 'book'
    | 'series'
    | 'serviceType'
    | 'seriesType';

export function useFilterLabelCache(): FilterLabelCache;
```

The hook uses a `useRef<Map<Dimension, Map<number, string>>>()` so the cache survives re-renders and refetches.

- [ ] **Step 2: Write the failing tests**

Test:
1. `absorb` + `getLabel` round-trips a label.
2. `absorb` with a partial list doesn't remove previously-absorbed entries (cache only grows).
3. `mergeSelectedIntoOptions` appends selected-but-missing options at the bottom, using cached labels.
4. `mergeSelectedIntoOptions` with a selected ID that was never absorbed falls back to rendering the dimension singular + ID (e.g. `"Speaker 42"`).
5. Two `useFilterLabelCache()` instances do NOT share state (per-widget-instance scope).

- [ ] **Step 3: Run the tests to confirm they fail**

```bash
pnpm test --filter=widget-sermons -- use-filter-label-cache
```

Expected: FAIL — module does not exist.

- [ ] **Step 4: Implement the hook**

```ts
import { useRef, useCallback, useMemo } from 'react';

export type Dimension =
    | 'speaker'
    | 'book'
    | 'series'
    | 'serviceType'
    | 'seriesType';

const DIMENSION_SINGULAR: Record<Dimension, string> = {
    speaker: 'Speaker',
    book: 'Book',
    series: 'Series',
    serviceType: 'Service Type',
    seriesType: 'Series Type',
};

export interface FilterLabelCache {
    getLabel(dimension: Dimension, id: number): string | undefined;
    absorb(
        dimension: Dimension,
        options: { id: number; label: string }[],
    ): void;
    mergeSelectedIntoOptions(
        dimension: Dimension,
        narrowedOptions: { value: string; label: string }[],
        selectedIds: number[],
    ): { value: string; label: string }[];
}

export function useFilterLabelCache(): FilterLabelCache {
    const cacheRef = useRef<Map<Dimension, Map<number, string>>>(new Map());

    const getLabel = useCallback((dimension: Dimension, id: number) => {
        return cacheRef.current.get(dimension)?.get(id);
    }, []);

    const absorb = useCallback(
        (dimension: Dimension, options: { id: number; label: string }[]) => {
            let dimMap = cacheRef.current.get(dimension);
            if (!dimMap) {
                dimMap = new Map();
                cacheRef.current.set(dimension, dimMap);
            }
            for (const opt of options) dimMap.set(opt.id, opt.label);
        },
        [],
    );

    const mergeSelectedIntoOptions = useCallback(
        (
            dimension: Dimension,
            narrowedOptions: { value: string; label: string }[],
            selectedIds: number[],
        ) => {
            const presentValues = new Set(
                narrowedOptions.map((o) => o.value),
            );
            const missing = selectedIds
                .filter((id) => !presentValues.has(String(id)))
                .map((id) => ({
                    value: String(id),
                    label:
                        cacheRef.current.get(dimension)?.get(id)
                        ?? `${DIMENSION_SINGULAR[dimension]} ${id}`,
                }));
            return [...narrowedOptions, ...missing];
        },
        [],
    );

    // Memoize the returned object so consumers that list `labelCache` in
    // useEffect deps don't re-run on every parent render.
    return useMemo(
        () => ({ getLabel, absorb, mergeSelectedIntoOptions }),
        [getLabel, absorb, mergeSelectedIntoOptions],
    );
}
```

- [ ] **Step 5: Run the tests to confirm they pass**

```bash
pnpm test --filter=widget-sermons -- use-filter-label-cache
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/widget-sermons/src/hooks/use-filter-label-cache.ts packages/widget-sermons/src/__tests__/hooks/use-filter-label-cache.test.tsx
git commit -m "feat: add useFilterLabelCache for selected-option preservation"
```

### Task 25: Prime the label cache with unfiltered facets fetches

**Files:**
- Modify: `packages/widget-sermons/src/components/sermons/SermonsView.tsx`

- [ ] **Step 1: Instantiate the cache and fire unfiltered primer fetches**

In `SermonsView`:

```ts
const labelCache = useFilterLabelCache();

// Unfiltered primer fetches — populate the label cache with the full set
// for each dimension. These are cheap: the API responds with the plain
// "speakers:all" cache entry per dimension.
const { data: allSpeakers = [] } = useSpeakers({ config });
const { data: allBooks = [] } = useBooks({ config });
const { data: allSeriesPage } = useSeries({ config, perPage: 50 });
const allSeriesItems = allSeriesPage?.series ?? [];
const { data: allServiceTypes = [] } = useServiceTypes({ config });
const { data: allSeriesTypes = [] } = useSeriesTypes({ config });

// Absorb into label cache via useEffect so it runs once per resolved
// dataset, not on every render (avoids double-absorb in React StrictMode).
useEffect(() => {
    labelCache.absorb(
        'speaker',
        allSpeakers.map((s) => ({ id: s.id, label: s.name })),
    );
}, [allSpeakers, labelCache]);

useEffect(() => {
    labelCache.absorb(
        'book',
        allBooks.map((b) => ({ id: b.id, label: b.name })),
    );
}, [allBooks, labelCache]);

useEffect(() => {
    labelCache.absorb(
        'series',
        allSeriesItems.map((s) => ({
            id: s.id,
            label: s.displayTitle ?? s.title,
        })),
    );
}, [allSeriesItems, labelCache]);

useEffect(() => {
    labelCache.absorb(
        'serviceType',
        allServiceTypes.map((s) => ({ id: s.id, label: s.name })),
    );
}, [allServiceTypes, labelCache]);

useEffect(() => {
    labelCache.absorb(
        'seriesType',
        allSeriesTypes.map((s) => ({ id: s.id, label: s.name })),
    );
}, [allSeriesTypes, labelCache]);
```

**Series primer perPage limitation:** `SeriesQuerySchema` caps `perPage` at 50. If the church has more than 50 published series, the primer will only cover the first page. Series beyond page 1 still get their labels absorbed the first time they appear in a filtered facets response, but until then they'd fall back to the `"Series {id}"` label (which is unlikely to be visible since the user had to have narrowed to see them). Acceptable trade-off. If this becomes a problem, add a loop that pages through all series in the primer.

- [ ] **Step 2: Replace the existing filtered facet hook calls with narrowed variants**

The existing `useSpeakers(config)` / `useBooks(config)` calls in `SermonsView` are now the *unfiltered primer* fetches. Add new *narrowed* fetches alongside them, passing in filter state from `useSermonFilters`:

```ts
const {
    data: narrowedSpeakers = [],
    isLoading: speakersLoading,
} = useSpeakers({
    config,
    search: filters.search || undefined,
    selectedSeriesIds: filters.selectedSeriesIds,
    selectedBookIds: filters.selectedBookIds,
    selectedServiceTypeIds: filters.selectedServiceTypeIds,
    selectedSeriesTypeIds: filters.selectedSeriesTypeIds,
    from: filters.from,
    to: filters.to,
});

const {
    data: narrowedBooks = [],
    isLoading: booksLoading,
} = useBooks({
    config,
    search: filters.search || undefined,
    selectedSeriesIds: filters.selectedSeriesIds,
    selectedSpeakerIds: filters.selectedSpeakerIds,
    selectedServiceTypeIds: filters.selectedServiceTypeIds,
    selectedSeriesTypeIds: filters.selectedSeriesTypeIds,
    from: filters.from,
    to: filters.to,
});

const {
    data: narrowedSeriesPage,
    isLoading: seriesLoading,
} = useSeries({
    config,
    perPage: 50,
    search: filters.search || undefined,
    selectedSpeakerIds: filters.selectedSpeakerIds,
    selectedBookIds: filters.selectedBookIds,
    selectedServiceTypeIds: filters.selectedServiceTypeIds,
    selectedSeriesTypeIds: filters.selectedSeriesTypeIds,
    from: filters.from,
    to: filters.to,
});
const narrowedSeries = narrowedSeriesPage?.series ?? [];

// Same array-returning pattern for narrowedServiceTypes (useServiceTypes)
// and narrowedSeriesTypes (useSeriesTypes) — both return arrays, so the
// `= []` default is correct.
```

`useSpeakers` / `useBooks` / `useServiceTypes` / `useSeriesTypes` return arrays (`Speaker[]`, `Book[]`, etc.), so `= []` is the right default for them. `useSeries` returns `{ series, pagination }`, so unwrap it explicitly into `narrowedSeries` before passing to `SermonFilters`.

TanStack Query dedupes the primer fetch (no filter params) from the narrowed fetch (filtered params) because the query keys differ.

- [ ] **Step 3: Pass narrowed lists AND the labelCache to SermonFilters**

Update the `<SermonFilters>` props to receive `speakers={narrowedSpeakers}`, `books={narrowedBooks}`, `seriesList={narrowedSeries}`, `serviceTypes={narrowedServiceTypes}`, `seriesTypes={narrowedSeriesTypes}`, plus a new `labelCache={labelCache}` prop.

- [ ] **Step 4: Run the widget tests**

```bash
pnpm test --filter=widget-sermons
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/widget-sermons/src/components/sermons/SermonsView.tsx
git commit -m "feat: wire SermonsView with narrowed facet hooks and label cache primer"
```

### Task 26: Merge selected options in SermonFilters via labelCache

**Files:**
- Modify: `packages/widget-sermons/src/components/sermons/SermonFilters.tsx`
- Modify: `packages/widget-sermons/src/__tests__/components/SermonFilters.test.tsx`

- [ ] **Step 1: Add `labelCache` to `SermonFiltersProps`**

```ts
import type { FilterLabelCache } from '../../hooks/use-filter-label-cache';

export interface SermonFiltersProps {
    // ... existing props
    labelCache: FilterLabelCache;
}
```

- [ ] **Step 2: Write failing tests for selected-option preservation**

Add tests:

1. Given `speakers=[{id:1, name:'A'}]` (narrowed), `selectedSpeakerIds=[1, 2]`, and a `labelCache` pre-seeded with `{speaker: {2: 'B'}}`, the speakers dropdown renders both A and B as options. B appears after A.
2. Given a selected ID with no cache entry, the dropdown option label falls back to `Speaker 42`.
3. Chips continue to show cached labels even if the ID falls out of the narrowed list.

- [ ] **Step 3: Run the tests to confirm they fail**

```bash
pnpm test --filter=widget-sermons -- SermonFilters
```

Expected: FAIL.

- [ ] **Step 4: Compute options via mergeSelectedIntoOptions**

Replace the `seriesOptions`, `speakerOptions`, `bookOptions`, `serviceTypeOptions`, `seriesTypeOptions` computations at the top of `SermonFilters` to feed through `labelCache.mergeSelectedIntoOptions`:

```ts
const speakerOptionsRaw: MultiComboboxOption[] = props.speakers.map((s) => ({
    value: String(s.id),
    label: s.name,
}));
const speakerOptions = props.labelCache.mergeSelectedIntoOptions(
    'speaker',
    speakerOptionsRaw,
    props.selectedSpeakerIds,
);
```

Same pattern for books, series, serviceTypes, seriesTypes. For the book grouping logic (which currently injects `__group_*` headers), apply the merge to the ungrouped base list and then re-group after — or, simpler, apply the merge to the already-grouped result (extra entries just end up after the last group header, which is acceptable).

- [ ] **Step 5: Replace chip label lookups to prefer labelCache**

Each chip today looks up its label from `seriesOptions.find(...)` / `speakerOptions.find(...)` / etc. Those lookups now include the merged options, so they already resolve correctly. Verify by reading the updated chip blocks — no change needed here if the merged options are used for the chip label lookup.

- [ ] **Step 6: Run the tests to confirm they pass**

```bash
pnpm test --filter=widget-sermons -- SermonFilters
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/widget-sermons/src/components/sermons/SermonFilters.tsx packages/widget-sermons/src/__tests__/components/SermonFilters.test.tsx
git commit -m "feat: preserve selected filter options via label cache"
```

### Task 27: Manual E2E of widget cross-filtering

**Files:**
- n/a

- [ ] **Step 1: Start storyboard pointed at a local perimeter-api with the API PR merged**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-api
pnpm dev
# In another terminal
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
VITE_API_MODE=local pnpm dev
```

- [ ] **Step 2: Verify filter narrowing**

Open the storyboard, navigate to the sermons widget. Test:

1. Pick a speaker from the Speakers dropdown. Open the Series dropdown — confirm it shows fewer series than unfiltered. Open the Books dropdown — same check.
2. Type in the search box. Confirm each facet dropdown narrows further.
3. Pick two speakers, then pick a book. Confirm series/service-types dropdowns narrow to the intersection. Unselect the book — dropdowns widen again.
4. Open a dropdown, narrow the facets such that one currently-selected option would drop from the list, confirm the selected option still appears in the dropdown (at the bottom).
5. Remove the selection from the chip — the option disappears from the dropdown on next narrowing.

- [ ] **Step 3: Verify locked filters don't render pills**

Edit the storyboard config to pin `data-speaker-id="5"` (or whatever valid speaker ID). Confirm:
- The Speakers dropdown does NOT render.
- No speaker chip renders even though `params.speaker` is set.
- Sermons returned are still narrowed to that speaker.

- [ ] **Step 4: Verify search**

Type a search term with `'` in it. Confirm no 502 and sensible results.

- [ ] **Step 5: Stop both dev servers**

### Task 28: Run pnpm quality and open PR B

**Files:**
- n/a

- [ ] **Step 1: Run quality**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
pnpm quality
```

Expected: PASS on typecheck, lint, format, test.

- [ ] **Step 2: Build dist (widgets commit their built artifacts)**

```bash
pnpm build
```

Running `pnpm build` at the repo root runs Turborepo's dependency graph so `@perimeter-widgets/shared` builds before `widget-sermons` picks up the new dropdown menu classes. If you use `pnpm build --filter=widget-sermons` instead, Turborepo will still honour the dependency and rebuild `shared` first.

Expected: `dist/sermons/sermons.js` is updated. Commit the dist:

```bash
git add dist/sermons
git commit -m "build: rebuild sermons widget dist"
```

- [ ] **Step 3: Push the branch**

```bash
git push -u origin feat/sermons-filter-cross-filtering
```

- [ ] **Step 4: Write the PR body to a file**

Use the Write tool to write `.tmp/pr-body-widgets.md` covering: cross-filtering (depends on API PR), dropdown menu border, small-list card hover, pill suppression, rebuilt dist. Include test plan checklist.

- [ ] **Step 5: Create the PR**

```bash
gh pr create --base dev --title "feat: cross-filter sermons widget dropdowns and polish UI" --body-file .tmp/pr-body-widgets.md
```

Return the PR URL to the user.

---

## Done criteria

- Both PRs merged to `dev` in their respective repos.
- Manual E2E checks all green (Tasks 6, 15, 27).
- `pnpm quality` passes in both repos after each PR.
- Sermon search returns results instead of 502.
- Picking a speaker narrows all other facet dropdowns.
- Locked filters render no pills or dropdowns.
- Small-list rows have per-row borders and stronger hover.
- Dropdown menus have a visible border in light mode.
