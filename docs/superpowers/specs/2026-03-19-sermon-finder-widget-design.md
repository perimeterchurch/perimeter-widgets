# Sermon Finder/Viewer Widget — Design Spec

**Date:** 2026-03-19
**Status:** Approved
**Widget Package:** `@perimeter-widgets/widget-sermons`

## Overview

A sermon finder and viewer widget for perimeter.org that allows visitors to search, filter, browse, and watch/listen to sermons. Embeds on WordPress via shadow DOM, fetches from the public sermons API at `api.perimeter.org`. Supports three browsing modes via top-level tabs: Sermons (searchable list), Series (browsable grid with drill-in), and Compilations (future — pending API).

## Decisions

| Decision             | Choice                                  | Rationale                                                                                                                                               |
| -------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navigation model     | Hybrid query string + React state       | Query strings for bookmarkable state (tab, view, id, search, filters, page, sort); React state for ephemeral UI (view toggle, filter panel open/closed) |
| Query string library | nuqs                                    | Type-safe hooks, handles encoding/history/batching, ~3KB, no router dependency                                                                          |
| Compilations         | Deferred — placeholder tab              | `Sermon_Compilations` MP table relationship undiscovered; tab shown as disabled with "Soon" badge                                                       |
| Media players        | Ported from helpdesk domain             | Custom VideoPlayer, AudioPlayer, PdfViewer + useMediaPlayer() hook — adapted for shadow DOM context                                                     |
| Player layout        | Tabbed                                  | Watch / Listen / PDF tabs within sermon detail; only shows tabs for available media types                                                               |
| Sermon list layout   | 3-view dropdown toggle                  | Card grid (default), small list, large feature cards — user selects via dropdown                                                                        |
| Filter layout        | Exposed + expandable                    | Search + series + speaker + sort visible inline; book, campus, date range behind "More Filters" button                                                  |
| Pagination           | Numbered pages                          | Classic `< 1 2 3 ... N >` — bookmarkable via `?page=N`, shows total scope                                                                               |
| DateTime library     | Luxon ^3.x                              | Matches perimeter-api; used for formatting sermon dates                                                                                                 |
| Top-level navigation | Tabbed: Sermons / Series / Compilations | Each tab is a first-class browsing mode with independent query string state                                                                             |

## API Endpoints

All public (no auth required), served from `api.perimeter.org`.

### Sermon Endpoints

| Endpoint                  | Method | Description                                       |
| ------------------------- | ------ | ------------------------------------------------- |
| `/api/sermons`            | GET    | List sermons with pagination, search, and filters |
| `/api/sermons/:id`        | GET    | Sermon detail with media links                    |
| `/api/sermons/series`     | GET    | List all series                                   |
| `/api/sermons/series/:id` | GET    | Series detail with embedded sermons               |
| `/api/sermons/speakers`   | GET    | List all speakers                                 |
| `/api/sermons/books`      | GET    | List Bible books referenced by sermons            |

### Query Parameters (GET /api/sermons)

| Param            | Type       | Default | Description                                |
| ---------------- | ---------- | ------- | ------------------------------------------ |
| `search`         | string     | —       | Text search on Title and Short_Description |
| `seriesId`       | integer    | —       | Filter by series                           |
| `speakerId`      | integer    | —       | Filter by speaker                          |
| `bookId`         | integer    | —       | Filter by Bible book                       |
| `congregationId` | integer    | —       | Filter by campus                           |
| `from`           | YYYY-MM-DD | —       | Start date (inclusive)                     |
| `to`             | YYYY-MM-DD | —       | End date (inclusive)                       |
| `page`           | integer    | 1       | Page number (min 1)                        |
| `perPage`        | integer    | 12      | Items per page (1-50)                      |
| `sort`           | string     | `date`  | Sort field: `date` or `title`              |
| `order`          | string     | `desc`  | Sort direction: `asc` or `desc`            |

### Response Types

```typescript
// Sermon list item (browse views)
type SermonListItem = {
    id: number;
    title: string;
    subtitle: string | null;
    shortDescription: string | null;
    date: string; // YYYY-MM-DD
    bannerUrl: string | null;
    speaker: { id: number; name: string };
    series: { id: number; title: string };
    congregation: { id: number };
};

// Sermon detail (detail view)
type SermonDetail = SermonListItem & {
    description: string | null; // HTML
    transcript: string | null;
    scriptureLinks: string | null;
    book: { id: number; name: string } | null;
    speaker: { id: number; name: string; bio: string | null };
    links: SermonLink[];
};

type SermonLink = {
    id: number;
    url: string;
    type: string; // "Watch", "Listen", "PDF", etc.
    mediaType: 'video' | 'audio' | 'document';
    duration: string | null; // "38:22"
    position: number | null;
};

// Series
type SeriesListItem = {
    id: number;
    title: string;
    displayTitle: string | null;
    subtitle: string | null;
    description: string | null;
    latestSermonDate: string | null;
    sermonCount: number;
    book: { id: number; name: string } | null;
};

type SeriesDetail = SeriesListItem & {
    sermons: SermonListItem[];
};

// Pagination envelope (GET /api/sermons only)
type PaginatedSermonsResponse = {
    success: true;
    data: {
        sermons: SermonListItem[];
        pagination: {
            page: number;
            perPage: number;
            total: number;
            totalPages: number;
        };
    };
};

// Other endpoint response shapes
// GET /api/sermons/:id       → { success: true, data: SermonDetail }
// GET /api/sermons/series    → { success: true, data: SeriesListItem[] }
// GET /api/sermons/series/:id → { success: true, data: SeriesDetail }
// GET /api/sermons/speakers  → { success: true, data: Speaker[] }
// GET /api/sermons/books     → { success: true, data: Book[] }

type Speaker = { id: number; name: string; bio: string | null };
type Book = { id: number; name: string };
```

## UI Architecture

### Top-Level Tab Bar

Three tabs: **Sermons** | **Series** | **Compilations**

- Compilations tab is disabled with a "Soon" badge until API support is added
- Each tab maintains independent query string state
- Tab selection persisted in `?tab=sermons|series`
- Switching tabs preserves the other tab's state in the URL

### Sermons Tab

#### Views (dropdown toggle)

| View        | Layout                                                                                                            | Best For              |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | --------------------- |
| Card Grid   | Responsive grid (3-col desktop, 2-col tablet, 1-col mobile) with banner image, title, speaker, date, series badge | Visual browsing       |
| Small List  | Compact rows with small thumbnail, title, speaker, date, series badge                                             | Scanning many results |
| Large Cards | Single-column horizontal cards with banner left, title + speaker + description + date + media badges right        | Reading descriptions  |

View selection is stored in React state (ephemeral, not in URL).

#### Filters

**Inline (always visible):**

- Search input (debounced, 300ms)
- Series dropdown (ComboSelect with search)
- Speaker dropdown (ComboSelect with search)
- Sort dropdown (Date: Newest, Date: Oldest, Title: A-Z, Title: Z-A)

**Expandable ("More Filters" button):**

- Bible Book dropdown
- Campus/Congregation dropdown
- Date range picker (from/to date inputs using Luxon)
- "Clear All" link to reset all filters

**Filter → URL → API mapping:**

Widget URLs use short param names for clean, readable URLs. The `useSermons` hook maps these to API param names when building requests.

| Filter      | URL Param        | API Param        | Example                 |
| ----------- | ---------------- | ---------------- | ----------------------- |
| Search text | `search`         | `search`         | `?search=hope`          |
| Series      | `series`         | `seriesId`       | `?series=945`           |
| Speaker     | `speaker`        | `speakerId`      | `?speaker=7`            |
| Sort        | `sort` + `order` | `sort` + `order` | `?sort=date&order=desc` |
| Book        | `book`           | `bookId`         | `?book=22`              |
| Campus      | `campus`         | `congregationId` | `?campus=1`             |
| Date from   | `from`           | `from`           | `?from=2024-01-01`      |
| Date to     | `to`             | `to`             | `?to=2024-12-31`        |
| Page        | `page`           | `page`           | `?page=3`               |

#### Results

- Result count displayed: "342 sermons"
- Active filter chips shown below filter bar (clickable to remove)
- Numbered pagination at bottom: `< 1 2 3 ... 29 >`

### Sermon Detail View

Accessed via `?tab=sermons&screen=detail&id=5302` (or from series detail).

**Layout (top to bottom):**

1. **Back button** — Returns to previous list (sermons or series detail). Scroll position is not preserved across navigation (non-trivial in shadow DOM); the list re-renders from query string state which is sufficient
2. **Title block** — Sermon title, speaker name, date (formatted with Luxon), series link, scripture references
3. **Tabbed media player** — Tabs shown only for available media types:
    - **Watch** — VideoPlayer component (ported from helpdesk, HTML5 `<video>`)
    - **Listen** — AudioPlayer component (ported from helpdesk, HTML5 `<audio>`)
    - **PDF** — PdfViewer component (ported from helpdesk, react-pdf)
    - Default to first available tab (Watch > Listen > PDF)
4. **Description** — Full HTML description rendered safely
5. **Speaker info** — Avatar (initials fallback), name, bio

### Series Tab

#### Series Grid

- Responsive card grid (same responsive columns as sermon card grid)
- Each card shows: title, subtitle, sermon count, latest sermon date, book badge (text-only cards — no banner image, as the API does not return images for series)
- Search input for filtering series by title (client-side filter on the full list — the API returns all series with no search/pagination params; acceptable for v1 with ~50-200 series)
- Click to drill into series detail

#### Series Detail View

Accessed via `?tab=series&screen=detail&id=945`.

1. **Back button** — Returns to series grid
2. **Series header** — Title, subtitle, description, sermon count, book
3. **Sermon list** — Numbered list of sermons in the series (ordered by date)
    - Each row: number, title, date, speaker
    - Click to navigate to sermon detail (`?tab=sermons&screen=detail&id=X`)

### Compilations Tab (Deferred)

- Tab visible but disabled with "Soon" badge
- Clicking shows an empty state: "Compilations coming soon"
- No API integration until `Sermon_Compilations` MP table relationship is researched and endpoints built
- Architecture designed to slot in as a third browsing mode with its own grid + detail views

## Component Architecture

### New Widget Components (`packages/widget-sermons/src/`)

```
src/
├── index.tsx                    # mountWidget() entry point
├── App.tsx                      # Top-level: tab bar + view routing
├── types.ts                     # Config schema, domain types (update existing)
├── styles.css                   # Tailwind + shared styles
├── hooks/
│   ├── use-sermons.ts           # useQuery: sermon list with filters
│   ├── use-sermon-detail.ts     # useQuery: single sermon by ID
│   ├── use-series.ts            # useQuery: series list
│   ├── use-series-detail.ts     # useQuery: single series by ID
│   ├── use-speakers.ts          # useQuery: speakers list (for filter dropdown)
│   ├── use-books.ts             # useQuery: books list (for filter dropdown)
│   ├── use-sermon-filters.ts    # nuqs: filter/search/sort/page state
│   └── use-media-player.ts      # Ported from helpdesk (shared playback state)
├── components/
│   ├── SermonTabs.tsx           # Top-level tab bar (Sermons | Series | Compilations)
│   ├── sermons/
│   │   ├── SermonsView.tsx      # Sermons tab container (filters + list + pagination)
│   │   ├── SermonFilters.tsx    # Search + inline filters + "More Filters" expansion
│   │   ├── SermonCardGrid.tsx   # Card grid view
│   │   ├── SermonSmallList.tsx  # Compact list view
│   │   ├── SermonLargeCards.tsx # Large feature card view
│   │   └── SermonDetail.tsx     # Detail view with tabbed player
│   ├── series/
│   │   ├── SeriesView.tsx       # Series tab container (search + grid)
│   │   ├── SeriesGrid.tsx       # Series card grid
│   │   └── SeriesDetail.tsx     # Series detail with sermon list
│   ├── players/
│   │   ├── VideoPlayer.tsx      # Ported from helpdesk, adapted for shadow DOM
│   │   ├── AudioPlayer.tsx      # Ported from helpdesk, adapted for shadow DOM
│   │   ├── PdfViewer.tsx        # Ported from helpdesk, adapted for shadow DOM
│   │   └── MediaTabs.tsx        # Tabbed container for Watch/Listen/PDF
│   └── compilations/
│       └── ComingSoon.tsx       # Placeholder view
└── __tests__/
    ├── sermon-filters.test.ts   # Filter state + URL sync tests
    ├── sermons-view.test.tsx    # Sermon list rendering tests
    └── sermon-detail.test.tsx   # Detail view rendering tests
```

### New Shared Components (`packages/shared/src/components/`)

| Component       | Location                        | Description                                                           |
| --------------- | ------------------------------- | --------------------------------------------------------------------- |
| Tabs            | `composite/Tabs.tsx`            | Reusable tab bar with active indicator, disabled state, badge support |
| Pagination      | `composite/Pagination.tsx`      | Numbered page buttons with ellipsis, prev/next, total pages           |
| SearchInput     | `primitives/SearchInput.tsx`    | Input with search icon, debounced onChange (300ms), clear button      |
| DateRangePicker | `composite/DateRangePicker.tsx` | From/to date inputs with Luxon formatting                             |

All new shared components will have Storybook stories.

### Ported Components (from perimeter-api helpdesk)

| Component      | Source                                                          | Adaptations Needed                                                                    |
| -------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| VideoPlayer    | `perimeter-api/src/components/helpdesk/viewers/VideoPlayer.tsx` | Remove Next.js imports, adapt styles for shadow DOM tokens, use widget's lucide-react |
| AudioPlayer    | `perimeter-api/src/components/helpdesk/viewers/AudioPlayer.tsx` | Same adaptations as VideoPlayer                                                       |
| PdfViewer      | `perimeter-api/src/components/helpdesk/viewers/PdfViewer.tsx`   | Remove `next/dynamic`, use standard lazy import, configure worker for CDN context     |
| useMediaPlayer | `perimeter-api/src/hooks/helpdesk/use-media-player.ts`          | No changes expected — pure React hook                                                 |

## Dependencies

### New Dependencies (widget-sermons)

| Package     | Version | Purpose                                     |
| ----------- | ------- | ------------------------------------------- |
| `nuqs`      | ^2.x    | Type-safe query string state management     |
| `luxon`     | ^3.7    | DateTime formatting (matches perimeter-api) |
| `react-pdf` | ^10.x   | PDF rendering in PdfViewer                  |

### Existing Dependencies (already in shared/widgets)

- `@tanstack/react-query` — server state
- `zod` — schema validation
- `lucide-react` — icons
- `@headlessui/react` — ComboSelect for filter dropdowns
- `framer-motion` — animations (AnimatedList for results)
- `tailwind-merge` + `clsx` — classname utilities

## Storyboard Config

Update `packages/storyboard/src/registry.ts` — the sermons widget entry already exists as `skeleton` status. Update to `ready` and add new config fields:

```typescript
{
  id: 'sermons',
  name: 'Sermons',
  description: 'Search and browse sermons and sermon series with watch/listen view',
  elementId: 'perimeter-sermons',
  status: 'ready',
  load: async () => { /* existing load function */ },
  configFields: [
    // NOTE: Existing registry uses string slugs ('buckhead', 'brookhaven', 'peachtree-corners').
    // Migration to integer congregation IDs is required. Update existing WordPress embeds
    // from data-campus="buckhead" to data-campus="1" (or add backwards-compatible slug→ID mapping).
    { key: 'campus', label: 'Campus', type: 'select', defaultValue: '', options: [
      { label: 'All Campuses', value: '' },
      { label: 'Buckhead', value: '1' },
      { label: 'Brookhaven', value: '2' },
      { label: 'Peachtree Corners', value: '3' },
    ]},
    { key: 'perPage', label: 'Per Page', type: 'number', defaultValue: 12 },
    { key: 'defaultTab', label: 'Default Tab', type: 'select', defaultValue: 'sermons', options: [
      { label: 'Sermons', value: 'sermons' },
      { label: 'Series', value: 'series' },
    ]},
    { key: 'defaultView', label: 'Default View', type: 'select', defaultValue: 'grid', options: [
      { label: 'Card Grid', value: 'grid' },
      { label: 'Small List', value: 'list' },
      { label: 'Large Cards', value: 'large' },
    ]},
  ],
}
```

## Query String Schema

All query params managed via `nuqs` hooks in `use-sermon-filters.ts`:

```typescript
// Sermons tab
const sermonsParams = {
    tab: parseAsStringLiteral(['sermons', 'series']).withDefault('sermons'),
    screen: parseAsStringLiteral(['browse', 'detail']).withDefault('browse'),
    id: parseAsInteger,
    search: parseAsString.withDefault(''),
    series: parseAsInteger,
    speaker: parseAsInteger,
    book: parseAsInteger,
    campus: parseAsInteger,
    from: parseAsString, // YYYY-MM-DD
    to: parseAsString, // YYYY-MM-DD
    sort: parseAsStringLiteral(['date', 'title']).withDefault('date'),
    order: parseAsStringLiteral(['asc', 'desc']).withDefault('desc'),
    page: parseAsInteger.withDefault(1),
};
// Note: perPage is sourced from widget config (data-per-page attribute), not from URL query params.
// This keeps the URL clean — perPage is a site-level config, not a user-facing filter.
```

**URL examples:**

- Browse sermons: `?tab=sermons&sort=date&order=desc&page=1`
- Search sermons: `?tab=sermons&search=hope&page=1`
- Filtered: `?tab=sermons&speaker=7&series=945&from=2024-01-01`
- Sermon detail: `?tab=sermons&screen=detail&id=5302`
- Series browse: `?tab=series`
- Series detail: `?tab=series&screen=detail&id=945`

## Data Flow

```
WordPress Page
└── <div id="perimeter-sermons" data-campus="1" data-per-page="12">
    └── Shadow DOM (mountWidget)
        └── QueryClientProvider + ConfigProvider
            └── App.tsx
                ├── nuqs reads/writes URL query params
                ├── SermonTabs (tab routing)
                │   ├── SermonsView
                │   │   ├── SermonFilters → nuqs state → useSermons(filters)
                │   │   │                                    └── React Query → GET /api/sermons?...
                │   │   ├── SermonCardGrid / SmallList / LargeCards ← query data
                │   │   └── Pagination → nuqs page state
                │   ├── SeriesView
                │   │   ├── SeriesGrid ← useSeries() → GET /api/sermons/series
                │   │   └── SeriesDetail ← useSeriesDetail(id) → GET /api/sermons/series/:id
                │   └── ComingSoon (Compilations placeholder)
                └── SermonDetail (when screen=detail)
                    ├── useSermonDetail(id) → GET /api/sermons/:id
                    └── MediaTabs
                        ├── VideoPlayer (links where mediaType='video')
                        ├── AudioPlayer (links where mediaType='audio')
                        └── PdfViewer (links where mediaType='document')
```

## Shadow DOM Considerations

- **nuqs + shadow DOM:** nuqs operates on `window.location` which is outside the shadow DOM — this works correctly since query strings are a page-level concept
- **react-pdf worker:** Must load from CDN (unpkg) since the widget is an IIFE bundle — same pattern as helpdesk's Turbopack workaround
- **Media players:** Fullscreen API may behave differently inside shadow DOM — needs testing. Fallback: use the shadow host element for fullscreen rather than the video element directly
- **Style isolation:** All player styles must use the widget's Tailwind tokens, not the host page's styles. The existing `?inline` CSS import pattern handles this

## Loading States

| View                                       | Loading Behavior                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Sermon list (any view mode)                | Skeleton cards/rows matching the active view layout (use `Skeleton` + `SkeletonTransition` from shared) |
| Sermon detail                              | Skeleton placeholders for title block, player area, and description                                     |
| Series grid                                | Skeleton cards matching series card layout                                                              |
| Series detail                              | Skeleton for header + skeleton rows for sermon list                                                     |
| Filter dropdowns (speakers, books, series) | ComboSelect shows loading spinner while options fetch                                                   |
| Page navigation                            | Sermon list shows skeleton overlay while new page loads (keeps pagination visible)                      |

PdfViewer is lazy-loaded (`React.lazy`) — only imported when the PDF tab is selected. This avoids bundling ~500KB of react-pdf for users who never view PDFs.

## Error Handling

| Scenario               | Behavior                                                        |
| ---------------------- | --------------------------------------------------------------- |
| API unreachable        | EmptyState with retry button                                    |
| No results for filters | EmptyState: "No sermons found" with suggestion to clear filters |
| Sermon not found (404) | EmptyState with back button                                     |
| Media URL broken       | Player shows error state with fallback message                  |
| PDF fails to load      | PdfViewer error state with download link                        |

## Testing Strategy

- **Unit tests:** Filter state logic, URL serialization/deserialization, date formatting
- **Component tests:** Each view renders correctly with mock data, filter interactions update state, pagination navigation, tab switching
- **Storybook stories:** All new shared components (Tabs, Pagination, SearchInput, DateRangePicker) + sermon-specific views with mock data

## Implementation Notes

- **MSW handlers:** Update `packages/storyboard/src/mocks/handlers.ts` to cover all 6 endpoints (currently only covers `GET /api/sermons`, `GET /api/sermons/series`, `GET /api/sermons/:id`). Add handlers for `GET /api/sermons/series/:id`, `GET /api/sermons/speakers`, and `GET /api/sermons/books`. Update mock data to use the response types defined in this spec.
- **Widget docs:** Update `docs/widgets/sermons.md` to reflect the final architecture (per project convention: "Update docs when changing code").
- **Campus migration:** The existing `SermonsConfigSchema` in `types.ts` defines `campus` as `z.string().optional()` with slug values. This must be migrated to integer congregation IDs. Consider a backwards-compatible mapping (`'buckhead'` → `1`) during the transition if existing WordPress embeds use slugs.
- **nuqs in WordPress:** Verify that nuqs' `pushState`/`replaceState` calls don't conflict with WordPress routing or plugins. Test in the storyboard first, then in a real WordPress embed.
- **Accessibility:** Tabs component must support keyboard navigation (arrow keys between tabs, Enter/Space to select). Media players need keyboard controls. Filter panel expansion should manage focus appropriately.

## Future Work

- **Compilations:** Research `Sermon_Compilations` MP table relationship, build API endpoints, then implement as third tab
- **Sermon Bible Verses:** `Sermon_Bible_Verses` junction table is out of scope for v1
- **Full-text search:** Current search uses OData `contains()` on Title and Short_Description; could be enhanced with a stored procedure later
- **Share/embed buttons:** Deep link sharing for individual sermons
- **Recently played:** localStorage-based history of recently viewed sermons
