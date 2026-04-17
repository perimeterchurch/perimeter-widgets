import { useQuery } from '@tanstack/react-query';
import { createApiClient, createApiError } from '@perimeter-widgets/shared';
import type { SermonsConfig } from '../types';

export interface UseSpeakersParams {
    config: SermonsConfig;
    search?: string;
    selectedSeriesIds?: number[];
    selectedBookIds?: number[];
    selectedServiceTypeIds?: number[];
    selectedSeriesTypeIds?: number[];
    from?: string;
    to?: string;
}

export function useSpeakers(params: UseSpeakersParams) {
    const {
        config,
        search,
        selectedSeriesIds = [],
        selectedBookIds = [],
        selectedServiceTypeIds = [],
        selectedSeriesTypeIds = [],
        from,
        to,
    } = params;

    const seriesId =
        selectedSeriesIds.length > 0 ? selectedSeriesIds.join(',') : undefined;
    const bookId =
        selectedBookIds.length > 0 ? selectedBookIds.join(',') : undefined;
    const serviceTypeId =
        selectedServiceTypeIds.length > 0 ?
            selectedServiceTypeIds.join(',')
        :   undefined;
    const seriesTypeId =
        selectedSeriesTypeIds.length > 0 ?
            selectedSeriesTypeIds.join(',')
        :   undefined;

    return useQuery({
        queryKey: [
            'speakers',
            config.apiUrl,
            { search, seriesId, bookId, serviceTypeId, seriesTypeId, from, to },
        ],
        queryFn: async () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            const { data, error } = await client.GET('/api/sermons/speakers', {
                params: {
                    query: {
                        search: search || undefined,
                        seriesId,
                        bookId,
                        serviceTypeId,
                        seriesTypeId,
                        from: from || undefined,
                        to: to || undefined,
                    },
                },
            });
            if (error) throw createApiError('Failed to fetch speakers', error);
            return data.data;
        },
    });
}
