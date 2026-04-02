import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SermonsConfig } from '../types';
import { createApiError } from '../lib/api-error';

export interface UseSeriesParams {
    search?: string;
    from?: string;
    to?: string;
    page?: number;
    perPage?: number;
    sort?: 'date' | 'title' | 'count';
    order?: 'asc' | 'desc';
    config: SermonsConfig;
}

export function useSeries(params: UseSeriesParams) {
    const {
        search,
        from,
        to,
        page = 1,
        perPage = 12,
        sort = 'date',
        order = 'desc',
        config,
    } = params;

    return useQuery({
        queryKey: [
            'series-list',
            { search, from, to, page, perPage, sort, order },
        ],
        queryFn: async () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            const { data, error } = await client.GET('/api/sermons/series', {
                params: {
                    query: {
                        search: search || undefined,
                        from: from || undefined,
                        to: to || undefined,
                        page,
                        perPage,
                        sort,
                        order,
                    },
                },
            });
            if (error) throw createApiError('Failed to fetch series', error);
            return data.data;
        },
    });
}
