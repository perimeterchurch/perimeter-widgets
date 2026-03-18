# Sermons Widget

> **Scope:** Sermon search/browse, series listing, watch/listen view
> **Key files:** `packages/widget-sermons/src/`
> **Status:** Skeleton — placeholder UI, awaiting API endpoints
> **Last verified:** 2026-03-18

---

## Overview

Public widget for searching and browsing sermons and sermon series on perimeter.org. Includes a watch/listen view for individual sermons with video and audio playback.

---

## WordPress Embed

```html
<div id="perimeter-sermons" data-campus="buckhead" data-per-page="12"></div>
<script src="https://cdn.jsdelivr.net/gh/PerimeterChurch/perimeter-widgets@latest/dist/sermons/sermons.js"></script>
```

---

## Config (data attributes)

| Attribute       | Type   | Default                     | Description                |
| --------------- | ------ | --------------------------- | -------------------------- |
| `data-campus`   | string | _(none)_                    | Filter sermons by campus   |
| `data-per-page` | number | `12`                        | Number of sermons per page |
| `data-api-url`  | string | `https://api.perimeter.org` | API base URL override      |

---

## Data Types

### Sermon

```typescript
interface Sermon {
    id: number;
    title: string;
    speaker: string;
    date: string;
    seriesId?: number;
    seriesName?: string;
    description?: string;
    videoUrl?: string;
    audioUrl?: string;
    thumbnailUrl?: string;
}
```

### SermonSeries

```typescript
interface SermonSeries {
    id: number;
    name: string;
    description?: string;
    imageUrl?: string;
    sermonCount: number;
}
```

**Note:** These are placeholder types. Final schemas will be defined from MP table structures via `pnpm mp-explore` in perimeter-api.

---

## API Endpoints (planned)

All under `(public)` route group in perimeter-api — no authentication required.

| Method | Path                      | Description                |
| ------ | ------------------------- | -------------------------- |
| GET    | `/api/sermons`            | List/search sermons        |
| GET    | `/api/sermons/:id`        | Sermon detail              |
| GET    | `/api/sermons/series`     | List sermon series         |
| GET    | `/api/sermons/series/:id` | Series detail with sermons |

Data source: Ministry Platform database tables (to be discovered via `pnpm mp-explore tables --filter "Sermon"`).

---

## Planned Components

| Component      | Purpose                                                        |
| -------------- | -------------------------------------------------------------- |
| `SermonSearch` | Search/filter bar with text input and filters                  |
| `SermonList`   | Grid/list of sermon cards with pagination                      |
| `SermonCard`   | Individual sermon preview with thumbnail, title, speaker, date |
| `SeriesGrid`   | Grid of sermon series with images                              |
| `SermonPlayer` | Watch/listen view with video embed and audio player            |

---

## Auth

Public widget — `requiresAuth: false`. No authentication needed.

---

## Related Docs

- [Architecture Overview](../architecture/overview.md) — Widget lifecycle
- [Adding a Widget](../guides/adding-a-widget.md) — How this widget was scaffolded
- [Widget Embed Guide](../reference/embed-guide.md) — Embed patterns
