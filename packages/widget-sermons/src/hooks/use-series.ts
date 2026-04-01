import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SermonsConfig, SeriesListItem, Pagination } from '../types';

export interface UseSeriesParams {
    search?: string;
    page?: number;
    perPage?: number;
    sort?: 'date' | 'title' | 'count';
    order?: 'asc' | 'desc';
    config: SermonsConfig;
}

interface PaginatedSeriesResponse {
    series: SeriesListItem[];
    pagination: Pagination;
}

export function useSeries(params: UseSeriesParams) {
    const {
        search,
        page = 1,
        perPage = 12,
        sort = 'date',
        order = 'desc',
        config,
    } = params;

    return useQuery({
        queryKey: ['series-list', { search, page, perPage, sort, order }],
        queryFn: async () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            const { data, error } = await client.GET('/api/sermons/series', {
                params: {
                    query: {
                        search: search || undefined,
                        page,
                        perPage,
                        sort,
                        order,
                    },
                } as Record<string, unknown>,
            });
            if (error) throw new Error('Failed to fetch series');
            // The API returns { series, pagination } but the published types
            // haven't been updated yet. Cast until @perimeterchurch/api is republished.
            return data.data as unknown as PaginatedSeriesResponse;
        },
    });
}
