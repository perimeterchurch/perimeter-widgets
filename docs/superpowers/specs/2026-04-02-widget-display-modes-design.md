# Widget Display Modes & Config Params

> **Date:** 2026-04-02
> **Status:** Approved
> **Scope:** Sermons widget data-* attribute config expansion

## Problem

The sermons widget currently has minimal configuration — `serviceTypes`, `perPage`, `defaultTab`, `defaultView`, and `apiUrl`. WordPress embedders need more control:

1. **Lock to a single tab** (sermons or series) and hide the tab switcher
2. **Lock specific filters** (series, speaker, book, service type, date range) so the widget shows a curated subset without exposing filter UI
3. **Control the chrome level** — full experience, compact (just sort/view/grid/pagination), or headless (just grid/pagination)

## New `data-*` Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-tab` | `'sermons' \| 'series'` | — | Lock to single tab, hide tab switcher |
| `data-display` | `'full' \| 'compact' \| 'headless'` | `'full'` | Controls chrome level |
| `data-series-id` | number | — | Lock series filter (sermons tab only) |
| `data-speaker-id` | number | — | Lock speaker filter (sermons tab only) |
| `data-book-id` | number | — | Lock book filter (sermons tab only) |
| `data-service-type-id` | string (comma-sep IDs) | — | Lock service type filter by ID (sermons tab only) |
| `data-from` | `YYYY-MM-DD` | — | Lock start date (sermons tab only) |
| `data-to` | `YYYY-MM-DD` | — | Lock end date (sermons tab only) |

### Existing attributes (unchanged)

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-service-types` | string | — | Name-based fuzzy match (existing behavior) |
| `data-per-page` | number | 12 | Items per page |
| `data-default-tab` | `'sermons' \| 'series'` | `'sermons'` | Initial tab when `data-tab` is not set |
| `data-default-view` | `'grid' \| 'list' \| 'large'` | `'grid'` | Default view mode |
| `data-api-url` | string | — | API base URL override |

### Priority: `data-service-type-id` vs `data-service-types`

`data-service-type-id` (explicit IDs) takes priority over `data-service-types` (name-based fuzzy match). If both are set, `data-service-type-id` wins.

## Display Modes

| Mode | Tab switcher | Search + filters | Date picker | Sort + View | Grid/list | Pagination |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| `full` | yes* | yes | yes | yes | yes | yes |
| `compact` | yes* | no | no | yes | yes | yes |
| `headless` | no | no | no | no | yes | yes |

*Tab switcher hidden when `data-tab` is set (single-tab lock)

## Locked Filter Behavior

- When a filter is locked via `data-*`, the corresponding dropdown/picker is **removed from the UI entirely** (invisible to the user)
- The locked value is passed directly to the API hook, bypassing the nuqs URL state for that param
- Locked values cannot be changed by the user at runtime
- The "active filter chips" section does not show chips for locked filters
- The "Clear All" button does not clear locked filters

### Validation

If any sermon-only filter (`seriesId`, `speakerId`, `bookId`, `serviceTypeId`, `from`, `to`) is set while `data-tab="series"`, throw a config validation error at mount time via Zod `.refine()`.

## Architecture

### 1. SermonsConfigSchema (types.ts)

Expand the Zod schema with new optional fields:

```typescript
export const SermonsConfigSchema = z.object({
    // Existing
    serviceTypes: z.string().optional(),
    perPage: z.number().default(12),
    defaultTab: z.enum(['sermons', 'series']).default('sermons'),
    defaultView: z.enum(['grid', 'list', 'large']).default('grid'),
    apiUrl: z.string().optional(),
    // New
    tab: z.enum(['sermons', 'series']).optional(),
    display: z.enum(['full', 'compact', 'headless']).default('full'),
    seriesId: z.coerce.number().int().positive().optional(),
    speakerId: z.coerce.number().int().positive().optional(),
    bookId: z.coerce.number().int().positive().optional(),
    serviceTypeId: z.string().optional(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(
    (c) => {
        if (c.tab !== 'series') return true;
        return !c.seriesId && !c.speakerId && !c.bookId && !c.serviceTypeId && !c.from && !c.to;
    },
    { message: 'Sermon-only filters (seriesId, speakerId, bookId, serviceTypeId, from, to) cannot be used with tab="series"' },
);
```

### 2. useSermonFilters (use-sermon-filters.ts)

Accept config as a parameter. When `config.tab` is set, omit the `tab` param from nuqs registration. When a filter is locked (e.g., `config.seriesId`), omit that param from nuqs and return the locked value as a static field. The hook's return type stays the same — consumers don't need to know which values are locked vs dynamic.

### 3. App.tsx

- When `config.tab` is set, force `filters.tab` to that value and skip rendering `SermonTabs`
- When `config.display === 'headless'`, also skip `SermonTabs` regardless of tab lock

### 4. SermonsView

- Receives `config.display` to control chrome
- `display === 'full'`: show everything (current behavior)
- `display === 'compact'`: hide `SermonFilters` component entirely
- `display === 'headless'`: hide `SermonFilters` AND sort/view controls
- Locked filters merge into the API query with priority over user filters
- `SermonFilters` receives a `lockedFilters` set so it knows which dropdowns to hide

### 5. SeriesView

- Same display mode handling as SermonsView
- `display === 'full'`: show search, date range, sort, view
- `display === 'compact'`: hide search and date range
- `display === 'headless'`: hide all controls except grid and pagination

### 6. SermonFilters

- Receives `lockedFilters: Set<string>` prop
- For each filter in the set, skip rendering that dropdown
- Skip rendering locked filter chips
- "Clear All" only clears unlocked filters
- `hasActiveFilters` only considers unlocked filters

### 7. Storyboard Registry

Add config fields for all new params with appropriate types and descriptions.

## Example Embeds

### Full widget (default)
```html
<div id="perimeter-sermons"></div>
```

### Sermons only, locked to a specific series
```html
<div id="perimeter-sermons" data-tab="sermons" data-series-id="945"></div>
```

### Compact series browser
```html
<div id="perimeter-sermons" data-tab="series" data-display="compact"></div>
```

### Headless sermon grid for a specific speaker
```html
<div id="perimeter-sermons" data-tab="sermons" data-display="headless" data-speaker-id="7"></div>
```

### Invalid (throws at mount)
```html
<div id="perimeter-sermons" data-tab="series" data-speaker-id="7"></div>
<!-- Error: Sermon-only filters cannot be used with tab="series" -->
```
