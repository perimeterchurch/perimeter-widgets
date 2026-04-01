import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SermonsConfig, SortField, SortOrder } from '../types';

export interface UseFilterIdsParams {
    search?: string;
    series?: number | null;
    speaker?: number | null;
    book?: number | null;
    from?: string | null;
    to?: string | null;
    sort?: SortField;
    order?: SortOrder;
    config: SermonsConfig;
}

export interface FilterIdSets {
    seriesIds: Set<number>;
    speakerIds: Set<number>;
}

/**
 * Fetches all sermons matching the current filters (unpaginated) and extracts
 * the unique speaker and series IDs. Used for cross-filtering dropdown options.
 */
export function useFilterIds(params: UseFilterIdsParams) {
    const { search, series, speaker, book, from, to, sort, order, config } =
        params;

    return useQuery({
        queryKey: [
            'sermon-filter-ids',
            { search, series, speaker, book, from, to, sort, order },
        ],
        queryFn: async () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            const { data, error } = await client.GET('/api/sermons', {
                params: {
                    query: {
                        search: search || undefined,
                        seriesId: series ?? undefined,
                        speakerId: speaker ?? undefined,
                        bookId: book ?? undefined,
                        from: from ?? undefined,
                        to: to ?? undefined,
                        sort,
                        order,
                        page: 1,
                        perPage: 10000,
                    } as Record<string, unknown>,
                },
            });
            if (error) throw new Error('Failed to fetch filter IDs');
            const sermons = data.data.sermons;
            return {
                seriesIds: new Set(sermons.map((s) => s.series.id)),
                speakerIds: new Set(sermons.map((s) => s.speaker.id)),
            };
        },
        staleTime: 60_000,
    });
}
