import { z } from 'zod';

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
/*  API Response Types                                                 */
/* ------------------------------------------------------------------ */

export type Speaker = {
    id: number;
    name: string;
    bio: string | null;
};

export type Book = {
    id: number;
    name: string;
};

export type SermonLink = {
    id: number;
    url: string;
    type: string;
    mediaType: 'video' | 'audio' | 'document';
    duration: string | null;
    position: number | null;
};

export type SermonListItem = {
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

export type SermonDetail = SermonListItem & {
    description: string | null;
    transcript: string | null;
    scriptureLinks: string | null;
    book: Book | null;
    speaker: Speaker;
    links: SermonLink[];
};

export type SeriesListItem = {
    id: number;
    title: string;
    displayTitle: string | null;
    subtitle: string | null;
    description: string | null;
    latestSermonDate: string | null;
    sermonCount: number;
    book: Book | null;
};

export type SeriesDetail = SeriesListItem & {
    sermons: SermonListItem[];
};

export type Pagination = {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
};

/**
 * Response shape for GET /api/sermons (after envelope unwrap).
 * Note: createApiClient automatically unwraps the { success, data } envelope,
 * so hooks receive this type directly — NOT the raw { success: true, data: { ... } } wrapper.
 */
export type PaginatedSermonsResponse = {
    sermons: SermonListItem[];
    pagination: Pagination;
};

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
