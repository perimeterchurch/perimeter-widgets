import { z } from 'zod';
import type { operations } from '@perimeter/api-hooks';

/* ------------------------------------------------------------------ */
/*  Widget Configuration (from data-* attributes)                      */
/* ------------------------------------------------------------------ */

/**
 * Default series-type ID. Matches "Sunday Morning Sermon" in MP — the latest
 * raw sermon record is often a midweek Bible study or podcast, so the widget
 * pins to Sunday sermons unless the embedder overrides it. Same default the
 * sermons widget applies.
 */
export const DEFAULT_SERIES_TYPE_ID = '1';

export const LatestSermonConfigSchema = z.object({
  // Host-page config arrives as data-* attributes (always strings), so numeric
  // / boolean fields use z.coerce.* to parse studio + production identically.
  seriesTypeId: z.coerce
    .string()
    .default(DEFAULT_SERIES_TYPE_ID)
    .describe('Series type to pull the latest sermon from (default: Sunday Morning Sermon).'),
  seriesId: z.coerce.string().optional().describe('Pin to the latest sermon in one series by ID.'),
  speakerId: z.coerce.string().optional().describe('Pin to the latest sermon by one speaker.'),
  showImage: z.coerce.boolean().default(true).describe('Show the sermon artwork.'),
  showDate: z.coerce.boolean().default(true).describe('Show the sermon date.'),
  showSeries: z.coerce.boolean().default(true).describe('Show the series name.'),
  showPlayButton: z.coerce
    .boolean()
    .default(true)
    .describe('Show the Play button linking to the watch URL.'),
  playLabel: z.string().default('Play').describe('Label for the Play button.'),
  detailsUrl: z
    .string()
    .default('https://www.perimeter.org/sermons/sermon-details/')
    .describe('Base URL of the sermon-details page; the sermon ID is appended as ?id=.'),
  apiUrl: z.string().optional().describe('Override the perimeter-api base URL (advanced).'),
});

export type LatestSermonConfig = z.infer<typeof LatestSermonConfigSchema>;

/* ------------------------------------------------------------------ */
/*  API Response Types (derived from the OpenAPI spec)                 */
/* ------------------------------------------------------------------ */

type ListSermonsResponse =
  operations['listSermons']['responses']['200']['content']['application/json'];
export type SermonListItem = ListSermonsResponse['data']['sermons'][number];

type GetSermonResponse = operations['getSermon']['responses']['200']['content']['application/json'];
export type SermonDetail = GetSermonResponse['data'];
export type SermonLink = SermonDetail['links'][number];
