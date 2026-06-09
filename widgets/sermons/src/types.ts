import { z } from 'zod';
import type { operations } from '@perimeter/api-hooks';

/* ------------------------------------------------------------------ */
/*  Widget Configuration (from data-* attributes)                      */
/* ------------------------------------------------------------------ */

export const SermonsConfigSchema = z
  .object({
    // Existing
    perPage: z.coerce
      .number()
      .int()
      .min(1)
      .default(12)
      .describe('Number of results shown per page.'),
    defaultTab: z
      .enum(['sermons', 'series'])
      .default('sermons')
      .describe('Which tab is selected on first load.'),
    defaultView: z
      .enum(['grid', 'list', 'large'])
      .default('grid')
      .describe('Initial layout of the results list.'),
    apiUrl: z.string().optional().describe('Override the perimeter-api base URL (advanced).'),
    // Display and tab lock
    tab: z
      .enum(['sermons', 'series'])
      .optional()
      .describe('Lock the widget to a single tab and hide the tab bar.'),
    display: z
      .enum(['full', 'compact', 'headless'])
      .default('full')
      .describe('Overall density: full chrome, compact, or headless.'),
    // Locked filters (sermons tab only)
    seriesId: z.coerce.string().optional().describe('Pin results to one series by ID.'),
    speakerId: z.coerce.string().optional().describe('Pin results to one speaker by ID.'),
    bookId: z.coerce.string().optional().describe('Pin results to one Bible book by ID.'),
    serviceTypeId: z.coerce.string().optional().describe('Pin results to one service type by ID.'),
    seriesTypeId: z.coerce.string().optional().describe('Pin results to one series type by ID.'),
    // Hide individual filter dropdowns
    hideSeries: z.coerce.boolean().optional().describe('Hide the series filter dropdown.'),
    hideSpeaker: z.coerce.boolean().optional().describe('Hide the speaker filter dropdown.'),
    hideBook: z.coerce.boolean().optional().describe('Hide the Bible-book filter dropdown.'),
    hideServiceType: z.coerce
      .boolean()
      .optional()
      .describe('Hide the service-type filter dropdown.'),
    hideSeriesType: z.coerce.boolean().optional().describe('Hide the series-type filter dropdown.'),
    hideDate: z.coerce.boolean().optional().describe('Hide the date-range filter.'),
    hideSearch: z.coerce.boolean().optional().describe('Hide the search input.'),
    hidePagination: z.coerce.boolean().optional().describe('Hide the pagination controls.'),
    // Opt-in to show service-type / series-type dropdowns. Both default
    // to hidden because the embedded sermons widget is generally for
    // end-user consumption of one cohort (Sunday Morning), not internal
    // exploration. When showSeriesType is omitted the effective filter
    // pins to "Sunday Morning Sermon" (id=1) — see SermonsView /
    // SeriesView.
    showServiceType: z.coerce
      .boolean()
      .optional()
      .describe('Opt in to show the service-type dropdown.'),
    showSeriesType: z.coerce
      .boolean()
      .optional()
      .describe('Opt in to show the series-type dropdown (otherwise pinned to Sunday Morning).'),
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
      .optional()
      .describe('Earliest sermon date to include (YYYY-MM-DD).'),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
      .optional()
      .describe('Latest sermon date to include (YYYY-MM-DD).'),
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
