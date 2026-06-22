# Latest Sermon Widget

> **Scope:** A single "latest Sunday sermon" card — the most recent weekend message with its series artwork, speaker, date, and watch/listen links.
> **Key files:** _(not built yet)_ — planned at `widgets/latest-sermon/src/`
> **Status:** Backend ready, widget not started.

---

## Overview

A small, public card widget that surfaces the **single most recent Sunday sermon** (e.g. for a homepage or a sidebar) — distinct from the full [Sermons](sermons.md) browse/search widget. It replaces the "latest card" output the legacy `api_custom_Sermon_Series_Finder_Widget` stored proc produced.

The backing endpoint already exists in perimeter-api (`getLatestSundaySermon`, shipped via api PR #163), so building this widget is the standard [step 4 → 5](../guides-mdx/data-and-api.mdx) flow: sync types, write the hook, scaffold, style, release. No new perimeter-api work is required.

---

## Backing endpoint

`GET /api/sermons/latest` — `(public)` route group, no auth, operationId **`getLatestSundaySermon`**.

Returns the single most recent **published Sunday sermon**, defined as:

- a worship-service sermon — `Service_Type_ID = 1` ("Worship Service"), and
- whose series is a Sunday-morning series type — `Sermon_Series_Type_ID = 1` ("Sunday Morning Sermon").

The series-type filter is what distinguishes a real Sunday message from a podcast/class that also runs as a "worship service" on the same date. Ordered by `Sermon_Date desc, Sermon_ID desc` (deterministic same-date tiebreak), limited to one. Returns **404** when nothing matches.

The endpoint is edge-cached (`s-maxage=300, stale-while-revalidate=3600`) — the latest sermon is identical for every visitor and changes about weekly.

### Response shape — `LatestSundaySermon`

The full [`SermonDetail`](sermons.md#sermondetail) (speaker, series, media `links`) **plus** a ready-to-use `seriesImageUrl`:

```typescript
type LatestSundaySermon = SermonDetail & {
    // Absolute URL to the series artwork (the default image attached to the
    // series record), served via perimeter-api's own /api/sermons/series/:id/image
    // proxy — CORS-enabled and cache-controlled for browser embeds. Drop it
    // straight into an <img src>.
    seriesImageUrl: string;
};
```

```jsonc
{
    "success": true,
    "data": {
        "id": 5592,
        "title": "Work on Purpose",
        "description": "<p>...</p>",
        "date": "2026-06-14",
        "bannerUrl": null,
        "speaker": { "id": 7, "name": "Pastor John Smith", "bio": "..." },
        "series": { "id": 1355, "title": "Work in Progress" },
        "book": null,
        "congregation": { "id": 1 },
        "links": [
            /* SermonLink[] — watch/listen/document */
        ],
        "seriesImageUrl": "https://api.perimeter.org/api/sermons/series/1355/image"
    }
}
```

The hook returns this envelope; the sermon lives on `data.data` (the `success`/`data` wrapper, same as every other sermons hook).

---

## The hook to add

There is **no hook yet**. Add one at `packages/api-hooks/src/sermons/use-latest-sermon.ts`, following the params-free `use-sermon-detail.ts` pattern (this endpoint takes no query params or path params):

```ts
import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { fetchJson } from '../internal/fetch-json';

export type UseLatestSermonResponse =
  operations['getLatestSundaySermon']['responses']['200']['content']['application/json'];

export function useLatestSermon(): UseQueryResult<UseLatestSermonResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['latest-sermon'],
    queryFn: async () =>
      fetchJson<UseLatestSermonResponse>(client, '/api/sermons/latest', 'Latest sermon'),
  });
}
```

Then export it from `packages/api-hooks/src/index.ts` alongside the other sermons hooks:

```ts
export { useLatestSermon, type UseLatestSermonResponse } from './sermons/use-latest-sermon';
```

> `operations['getLatestSundaySermon']` only exists after you run `pnpm --filter @perimeter/api-hooks sync` to pull perimeter-api's regenerated `openapi/spec.yaml` (the endpoint is already in it as of api PR #163). Confirm the operationId in `packages/api-hooks/src/generated/operations.ts` after syncing.

---

## Build checklist

- [ ] `pnpm --filter @perimeter/api-hooks sync` — pull the spec; confirm `operations['getLatestSundaySermon']` exists.
- [ ] Write `use-latest-sermon.ts` on the pattern above; export it from the index.
- [ ] `pnpm create-widget latest-sermon`; commit the lockfile change.
- [ ] Build the card UI with `@perimeter/ui` (image from `seriesImageUrl`, title/date/speaker, watch/listen from `links`); render `Spinner`/`Empty` loading + error states. Handle the 404 (no Sunday sermon) as an empty state.
- [ ] `defineWidget({ auth: 'none' })` — public.
- [ ] Tests (render guard + bundle budget come scaffolded); `pnpm format && pnpm quality`; verify on a bare host page (`pnpm embed-lab`).
- [ ] `pnpm release latest-sermon --minor`.

---

## Related docs

- [Data & API](../guides-mdx/data-and-api.mdx) — the full cross-repo seam (sync → hook → consume).
- [Sermons widget](sermons.md) — the sibling browse/search widget and shared `SermonDetail` types.
- [Creating a widget](../creating-a-widget.md) — scaffold → endpoint → api-hooks → style → test → release.
- perimeter-api: `docs/domains/sermons.md` (the `GET /api/sermons/latest` section) is the authoritative endpoint reference.
