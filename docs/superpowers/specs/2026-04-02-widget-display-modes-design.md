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

`data-service-type-id` (explicit IDs) takes priority over `data-service-types` (name-based fuzzy match). If both are set, `data-service-type-id` wins. This resolution happens in `SermonsView` before passing to `useSermons`.

## Display Modes

### Browse view

| Mode | Tab switcher | Search + filters | Date picker | Sort + View | Grid/list | Pagination |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| `full` | yes* | yes | yes | yes | yes | yes |
| `compact` | yes* | no | no | yes | yes | yes |
| `headless` | no | no | no | no | yes | yes |

*Tab switcher hidden when `data-tab` is set (single-tab lock)

### Detail view

| Mode | Back button | Sermon/series info | Media player | "More from series" |
|------|:---:|:---:|:---:|:---:|
| `full` | yes | yes | yes | yes |
| `compact` | yes | yes | yes | yes |
| `headless` | yes | yes | yes | no |

Detail views are mostly unchanged across modes. Only headless hides the "More from this series" section to keep the view focused.

## Locked Filter Behavior

- When a filter is locked via `data-*`, the corresponding dropdown/picker is **removed from the UI entirely** (invisible to the user)
- The locked value is passed directly to the API hook, taking priority over any user-set URL state
- Locked values cannot be changed by the user at runtime
- The "active filter chips" section does not show chips for locked filters
- The "Clear All" button does not clear locked filters
- `hasActiveFilters` only considers unlocked filters

### Locked filters are sermons-tab-only

Locked filters (`seriesId`, `speakerId`, `bookId`, `serviceTypeId`, `from`, `to`) only apply to the sermons tab. When both tabs are visible (no `data-tab` set), the locked filters affect the sermons tab API query but do NOT affect the series tab. The series tab always uses its own filter state from nuqs without locked overrides.

### Validation

If any sermon-only filter is set while `data-tab="series"`, throw a config validation error at mount time via Zod `.refine()`.

## Architecture

### 1. SermonsConfigSchema (types.ts)

Expand the Zod schema with new optional fields. Use `z.coerce.string()` for `serviceTypeId` since `parseDataAttributes` auto-coerces single numeric strings to numbers:

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
    serviceTypeId: z.coerce.string().optional(),
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

**"Always register, override on return" pattern.** nuqs requires a static parser map — you cannot conditionally include/exclude keys between renders. The hook always registers all params with `useQueryStates`, but accepts `config` and overrides return values for locked params:

- `config.tab` set → return `config.tab` instead of `params.tab`; `setTab` becomes a no-op
- `config.seriesId` set → return `config.seriesId` instead of `params.series`; `setSeries` becomes a no-op
- Same pattern for all lockable filters
- `config.defaultTab` → construct the `tab` parser with `.withDefault(config.defaultTab)` (parsers are plain objects, not hooks, so this is safe inside the hook body)

The hook's return type stays the same — consumers don't need to know which values are locked vs dynamic.

### 3. App.tsx

- Read `config.tab` and `config.display` from the parsed config
- When `config.tab` is set OR `config.display === 'headless'`, skip rendering `SermonTabs`
- Pass `config` through to view components (already done — `useConfig<SermonsConfig>()`)

### 4. SermonsView

- Reads `config.display` to control chrome
- `display === 'full'`: show everything (current behavior)
- `display === 'compact'`: hide `SermonFilters` component entirely
- `display === 'headless'`: hide `SermonFilters` AND sort/view controls
- Service type ID merge order in `SermonsView`: `config.serviceTypeId` (locked) > `selectedServiceTypeIds` (user UI) > `resolveServiceTypeIds(config.serviceTypes)` (name-based). This resolution happens before calling `useSermons`.
- `SermonFilters` receives a `lockedFilters` set so it knows which dropdowns to hide when `display === 'full'`

### 5. SeriesView

- Same display mode handling
- `display === 'full'`: show search, date range, sort, view (current behavior)
- `display === 'compact'`: hide search and date range
- `display === 'headless'`: hide all controls except grid and pagination
- Locked sermon-only filters do NOT apply to the series tab

### 6. SermonFilters

- Receives `lockedFilters: Set<string>` prop
- For each filter in the set, skip rendering that dropdown
- Skip rendering locked filter chips
- "Clear All" only clears unlocked filters
- `hasActiveFilters` only considers unlocked filters

### 7. SermonDetail

- `display === 'headless'`: hide "More from this series" section
- All other modes: unchanged

### 8. Storyboard Registry

Add config fields for all new params. Use `'text'` type for date fields (no `'date'` type in the registry's `ConfigField`). Add select fields for `tab` and `display`.

### 9. Internal navigation with locked tab

When `config.tab` is set, internal navigation functions that set the tab (`setSermonFromSeries`, `setSeriesDetail`) should not change the tab value. The hook handles this by making tab-related setParams calls use `config.tab` instead of a hardcoded value when the tab is locked.

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
