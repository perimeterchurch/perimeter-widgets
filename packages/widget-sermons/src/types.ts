import { z } from 'zod';
import type { operations } from '@perimeter-widgets/shared';

/* ------------------------------------------------------------------ */
/*  Widget Configuration (from data-* attributes)                      */
/* ------------------------------------------------------------------ */

export const SermonsConfigSchema = z.object({
    campus: z.union([z.number(), z.string()]).optional(),
    perPage: z.number().default(12),
    defaultTab: z.enum(['sermons', 'series']).default('sermons'),
    defaultView: z.enum(['grid', 'list', 'large']).default('grid'),
    apiUrl: z.string().optional(),
});

export type SermonsConfig = z.infer<typeof SermonsConfigSchema>;

/* ------------------------------------------------------------------ */
/*  API Response Types (derived from OpenAPI spec)                     */
/* ------------------------------------------------------------------ */

type ListSermonsResponse =
    operations['listSermons']['responses']['200']['content']['application/json'];
export type SermonListItem = ListSermonsResponse['data']['sermons'][number];
export type Pagination = ListSermonsResponse['data']['pagination'];

type GetSermonResponse =
    operations['getSermon']['responses']['200']['content']['application/json'];
export type SermonDetail = GetSermonResponse['data'];
export type SermonLink = SermonDetail['links'][number];

type ListSeriesResponse =
    operations['listSeries']['responses']['200']['content']['application/json'];
export type SeriesListItem = ListSeriesResponse['data'][number];

type GetSeriesDetailResponse =
    operations['getSeriesDetail']['responses']['200']['content']['application/json'];
export type SeriesDetail = GetSeriesDetailResponse['data'];

type ListSpeakersResponse =
    operations['listSpeakers']['responses']['200']['content']['application/json'];
export type Speaker = ListSpeakersResponse['data'][number];

type ListBooksResponse =
    operations['listBooks']['responses']['200']['content']['application/json'];
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

export type TabId = 'sermons' | 'series' | 'compilations';
export type ScreenMode = 'browse' | 'detail';
export type ViewMode = 'grid' | 'list' | 'large';
export type SortField = 'date' | 'title';
export type SortOrder = 'asc' | 'desc';

/* ------------------------------------------------------------------ */
/*  Campus ID Mapping (backwards compat)                               */
/* ------------------------------------------------------------------ */

const CAMPUS_SLUG_MAP: Record<string, number> = {
    buckhead: 1,
    brookhaven: 2,
    'peachtree-corners': 3,
};

/** Resolve campus config (string slug or number) to a congregation ID */
export function resolveCampusId(
    campus: string | number | undefined,
): number | undefined {
    if (campus === undefined || campus === '') return undefined;
    if (typeof campus === 'number') return campus;
    return CAMPUS_SLUG_MAP[campus] ?? undefined;
}
