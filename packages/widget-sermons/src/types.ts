import { z } from 'zod';
import type { operations } from '@perimeter-widgets/shared';

/* ------------------------------------------------------------------ */
/*  Widget Configuration (from data-* attributes)                      */
/* ------------------------------------------------------------------ */

export const SermonsConfigSchema = z
    .object({
        // Existing
        serviceTypes: z.string().optional(),
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
            return (
                !c.seriesId
                && !c.speakerId
                && !c.bookId
                && !c.serviceTypeId
                && !c.from
                && !c.to
            );
        },
        {
            message:
                'Sermon-only filters (seriesId, speakerId, bookId, serviceTypeId, from, to) cannot be used with tab="series"',
        },
    );

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
export type SeriesListItem = ListSeriesResponse['data']['series'][number];

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

/**
 * Resolve comma-separated service type names from config against the
 * fetched service types list using fuzzy (substring) matching.
 * Returns a comma-separated string of matched IDs, or undefined if none.
 */
export function resolveServiceTypeIds(
    configNames: string | undefined,
    serviceTypes: ServiceType[],
): string | undefined {
    if (!configNames) return undefined;
    const names = configNames
        .split(',')
        .map((n) => n.toLowerCase().trim())
        .filter(Boolean);
    if (names.length === 0) return undefined;

    const matchedIds = serviceTypes
        .filter((st) => names.some((n) => st.name.toLowerCase().includes(n)))
        .map((st) => st.id);

    return matchedIds.length > 0 ? matchedIds.join(',') : undefined;
}
