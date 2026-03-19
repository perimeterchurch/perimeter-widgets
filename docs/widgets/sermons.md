# Sermons Widget

> **Scope:** Sermon search/browse, series listing, watch/listen view
> **Key files:** `packages/widget-sermons/src/`
> **Status:** Ready
> **Last verified:** 2026-03-19

---

## Overview

Public widget for searching and browsing sermons and sermon series on perimeter.org. Renders a tabbed interface (Sermons / Series / Compilations) with configurable layout, pagination, and campus filtering. Supports URL-driven state via nuqs for shareable deep links. Individual sermon detail view includes watch/listen media links.

---

## WordPress Embed

```html
<div
    id="perimeter-sermons"
    data-campus="1"
    data-per-page="12"
    data-default-tab="sermons"
    data-default-view="grid"
></div>
<script src="https://cdn.jsdelivr.net/gh/PerimeterChurch/perimeter-widgets@latest/dist/sermons/sermons.js"></script>
```

Backwards-compatible: `data-campus="buckhead"` (string slug) still works via `resolveCampusId()`.

---

## Config (data attributes)

| Attribute           | Type             | Default   | Description                                         |
| ------------------- | ---------------- | --------- | --------------------------------------------------- |
| `data-campus`       | number or string | _(none)_  | Filter by campus. Integer ID (1/2/3) or legacy slug |
| `data-per-page`     | number           | `12`      | Number of sermons per page                          |
| `data-default-tab`  | string           | `sermons` | Initial tab: `sermons` or `series`                  |
| `data-default-view` | string           | `grid`    | Initial layout: `grid`, `list`, or `large`          |
| `data-api-url`      | string           | _(none)_  | API base URL override (dev only)                    |

Campus integer IDs: `1` = Buckhead, `2` = Brookhaven, `3` = Peachtree Corners.

---

## Data Types

### SermonListItem

```typescript
type SermonListItem = {
    id: number;
    title: string;
    subtitle: string | null;
    shortDescription: string | null;
    date: string;
    bannerUrl: string | null;
    speaker: { id: number; name: string };
    series: { id: number; title: string };
    congregation: { id: number };
};
```

### SermonDetail

```typescript
type SermonDetail = SermonListItem & {
    description: string | null;
    transcript: string | null;
    scriptureLinks: string | null;
    book: Book | null;
    speaker: Speaker;
    links: SermonLink[];
};
```

### SeriesListItem

```typescript
type SeriesListItem = {
    id: number;
    title: string;
    displayTitle: string | null;
    subtitle: string | null;
    description: string | null;
    latestSermonDate: string | null;
    sermonCount: number;
    book: Book | null;
};
```

### Speaker

```typescript
type Speaker = {
    id: number;
    name: string;
    bio: string | null;
};
```

### Book

```typescript
type Book = {
    id: number;
    name: string;
};
```

### SermonLink

```typescript
type SermonLink = {
    id: number;
    url: string;
    type: string;
    mediaType: 'video' | 'audio' | 'document';
    duration: string | null;
    position: number | null;
};
```

### PaginatedSermonsResponse

```typescript
type PaginatedSermonsResponse = {
    sermons: SermonListItem[];
    pagination: {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
    };
};
```

---

## API Endpoints

All under the `(public)` route group in perimeter-api — no authentication required.

| Method | Path                      | Description                         |
| ------ | ------------------------- | ----------------------------------- |
| GET    | `/api/sermons`            | List/search sermons with pagination |
| GET    | `/api/sermons/:id`        | Sermon detail with links            |
| GET    | `/api/sermons/series`     | List sermon series                  |
| GET    | `/api/sermons/series/:id` | Series detail with sermons          |
| GET    | `/api/sermons/speakers`   | List speakers                       |
| GET    | `/api/sermons/books`      | List Bible books                    |

### Query Parameters for GET /api/sermons

| Param       | Type   | Description                   |
| ----------- | ------ | ----------------------------- |
| `page`      | number | Page number (default: 1)      |
| `perPage`   | number | Items per page (default: 12)  |
| `search`    | string | Full-text search              |
| `campusId`  | number | Filter by congregation ID     |
| `speakerId` | number | Filter by speaker ID          |
| `bookId`    | number | Filter by Bible book ID       |
| `seriesId`  | number | Filter by series ID           |
| `sort`      | string | Sort field: `date` or `title` |
| `order`     | string | Sort order: `asc` or `desc`   |

---

## Components

| Component       | Purpose                                                               |
| --------------- | --------------------------------------------------------------------- |
| `SermonsApp`    | Root component; wraps in NuqsAdapter for URL state                    |
| `SermonsWidget` | Inner widget; reads config, routes between browse and detail screens  |
| `SermonTabs`    | Tab bar: Sermons / Series / Compilations                              |
| `SermonsView`   | Sermons browse: search bar, filter panel, sermon list with pagination |
| `SermonDetail`  | Full sermon detail with media links and series context                |
| `SermonCard`    | Individual sermon card (grid / list / large variants)                 |
| `SermonFilters` | Collapsible filter panel (speaker, book, series)                      |
| `SeriesView`    | Series browse: grid of sermon series cards                            |
| `SeriesCard`    | Individual series card                                                |
| `SeriesDetail`  | Series detail with sermon list                                        |
| `ComingSoon`    | Placeholder for Compilations tab                                      |

---

## URL State

The widget uses nuqs to sync state to the URL query string. Parameters:

| Param     | Values                  | Description         |
| --------- | ----------------------- | ------------------- |
| `tab`     | `sermons`, `series`     | Active tab          |
| `view`    | `grid`, `list`, `large` | Sermon list layout  |
| `screen`  | `browse`, `detail`      | Current screen      |
| `id`      | number                  | Sermon ID in detail |
| `page`    | number                  | Current page        |
| `search`  | string                  | Search query        |
| `speaker` | number                  | Speaker filter      |
| `book`    | number                  | Book filter         |
| `series`  | number                  | Series filter       |
| `sort`    | `date`, `title`         | Sort field          |
| `order`   | `asc`, `desc`           | Sort direction      |

---

## Campus ID Mapping (Backwards Compat)

`resolveCampusId()` in `types.ts` converts string slugs to congregation IDs:

| Slug                | ID  |
| ------------------- | --- |
| `buckhead`          | 1   |
| `brookhaven`        | 2   |
| `peachtree-corners` | 3   |

---

## Auth

Public widget — `requiresAuth: false`. No authentication needed.

---

## Related Docs

- [Architecture Overview](../architecture/overview.md) — Widget lifecycle
- [Adding a Widget](../guides/adding-a-widget.md) — How this widget was scaffolded
- [Widget Embed Guide](../reference/embed-guide.md) — Embed patterns
