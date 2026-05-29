import { z } from 'zod';
import type { operations } from '@perimeter/api-types';

/* ------------------------------------------------------------------ */
/*  Widget Configuration (from data-* attributes)                      */
/* ------------------------------------------------------------------ */

export const SermonsConfigSchema = z
  .object({
    // Existing
    perPage: z.number().default(12),
    defaultTab: z.enum(['sermons', 'series']).default('sermons'),
    defaultView: z.enum(['grid', 'list', 'large']).default('grid'),
    apiUrl: z.string().optional(),
    // Display and tab lock
    tab: z.enum(['sermons', 'series']).optional(),
    display: z.enum(['full', 'compact', 'headless']).default('full'),
    // Locked filters (sermons tab only)
    seriesId: z.coerce.string().optional(),
    speakerId: z.coerce.string().optional(),
    bookId: z.coerce.string().optional(),
    serviceTypeId: z.coerce.string().optional(),
    seriesTypeId: z.coerce.string().optional(),
    // Hide individual filter dropdowns
    hideSeries: z.coerce.boolean().optional(),
    hideSpeaker: z.coerce.boolean().optional(),
    hideBook: z.coerce.boolean().optional(),
    hideServiceType: z.coerce.boolean().optional(),
    hideSeriesType: z.coerce.boolean().optional(),
    hideDate: z.coerce.boolean().optional(),
    hideSearch: z.coerce.boolean().optional(),
    hidePagination: z.coerce.boolean().optional(),
    // Opt-in to show service-type / series-type dropdowns. Both default
    // to hidden because the embedded sermons widget is generally for
    // end-user consumption of one cohort (Sunday Morning), not internal
    // exploration. When showSeriesType is omitted the effective filter
    // pins to "Sunday Morning Sermon" (id=1) — see SermonsView /
    // SeriesView.
    showServiceType: z.coerce.boolean().optional(),
    showSeriesType: z.coerce.boolean().optional(),
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
      .optional(),
  })
  .refine(
    (c) => {
      if (c.tab !== 'series') return true;
      return !c.seriesId && !c.speakerId && !c.bookId && !c.serviceTypeId && !c.from && !c.to;
    },
    {
      message:
        'Sermon-only filters (seriesId, speakerId, bookId, serviceTypeId, from, to) cannot be used with tab="series"',
    },
  );

/**
 * Default series-type ID applied when the embedder hasn't pinned a series
 * type AND hasn't opted into the dropdown. Matches "Sunday Morning Sermon"
 * in MP — the primary use case for the embedded widget.
 */
export const DEFAULT_SERIES_TYPE_ID = '1';

/**
 * Returns a copy of the config with widget-side defaults applied:
 * - `seriesTypeId` defaults to "Sunday Morning Sermon" (id=1) when no
 *   explicit value is set AND the dropdown isn't opted-in via
 *   `showSeriesType`.
 *
 * Both Sermons and Series tabs run config through this helper before
 * passing to hooks/children, so the default applies uniformly.
 */
export function applyWidgetDefaults(config: SermonsConfig): SermonsConfig {
  if (config.seriesTypeId || config.showSeriesType === true) return config;
  return { ...config, seriesTypeId: DEFAULT_SERIES_TYPE_ID };
}

export type SermonsConfig = z.infer<typeof SermonsConfigSchema>;

/* ------------------------------------------------------------------ */
/*  API Response Types (derived from OpenAPI spec)                     */
/* ------------------------------------------------------------------ */

type ListSermonsResponse =
  operations['listSermons']['responses']['200']['content']['application/json'];
export type SermonListItem = ListSermonsResponse['data']['sermons'][number];
export type Pagination = ListSermonsResponse['data']['pagination'];

type GetSermonResponse = operations['getSermon']['responses']['200']['content']['application/json'];
export type SermonDetail = GetSermonResponse['data'];
export type SermonLink = SermonDetail['links'][number];

type ListSeriesResponse =
  operations['listSeries']['responses']['200']['content']['application/json'];
export type SeriesListItem = ListSeriesResponse['data']['series'][number];

type GetSeriesDetailResponse =
  operations['getSeriesDetail']['responses']['200']['content']['application/json'];
export type SeriesDetail = GetSeriesDetailResponse['data'];

type ListSpeakersResponse =
  operations['listSpeakers']['responses']['200']['content']['application/json'];
export type Speaker = ListSpeakersResponse['data'][number];

type ListBooksResponse = operations['listBooks']['responses']['200']['content']['application/json'];
export type Book = ListBooksResponse['data'][number];

/**
 * Response shape for GET /api/sermons (after envelope unwrap).
 */
export type PaginatedSermonsResponse = ListSermonsResponse['data'];

/* ------------------------------------------------------------------ */
/*  Shared Component Props                                             */
/* ------------------------------------------------------------------ */

export interface SermonListViewProps {
  sermons: SermonListItem[];
  onSermonClick: (id: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Tab and View Types                                                 */
/* ------------------------------------------------------------------ */

export type TabId = 'sermons' | 'series';
export type ScreenMode = 'browse' | 'detail';
export type ViewMode = 'grid' | 'list' | 'large';
export type SortField = 'date' | 'title' | 'count';
export type SortOrder = 'asc' | 'desc';

/* ------------------------------------------------------------------ */
/*  Service Type                                                       */
/* ------------------------------------------------------------------ */

type ListServiceTypesResponse =
  operations['listServiceTypes']['responses']['200']['content']['application/json'];
export type ServiceType = ListServiceTypesResponse['data'][number];

/* ------------------------------------------------------------------ */
/*  Series Type                                                        */
/* ------------------------------------------------------------------ */

type ListSeriesTypesResponse =
  operations['listSeriesTypes']['responses']['200']['content']['application/json'];
export type SeriesType = ListSeriesTypesResponse['data'][number];
