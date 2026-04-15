import { useQuery } from '@tanstack/react-query';
import { createApiClient, createApiError } from '@perimeter-widgets/shared';
import type { SermonsConfig } from '../types';

export interface UseSeriesParams {
    search?: string;
    selectedSeriesTypeIds?: number[];
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
        selectedSeriesTypeIds = [],
        from,
        to,
        page = 1,
        perPage = 12,
        sort = 'date',
        order = 'desc',
        config,
    } = params;

    const seriesTypeId =
        selectedSeriesTypeIds.length > 0 ?
            selectedSeriesTypeIds.join(',')
        :   undefined;

    return useQuery({
        queryKey: [
            'series-list',
            { search, seriesTypeId, from, to, page, perPage, sort, order },
        ],
        queryFn: async () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            const { data, error } = await client.GET('/api/sermons/series', {
                params: {
                    query: {
                        search: search || undefined,
                        seriesTypeId,
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
