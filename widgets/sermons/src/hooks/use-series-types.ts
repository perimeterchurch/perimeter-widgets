import { useQuery } from '@tanstack/react-query';
import { createApiClient, createApiError } from '@perimeter-widgets/shared';
import type { SermonsConfig } from '../types';

export interface UseSeriesTypesParams {
    config: SermonsConfig;
    search?: string;
    selectedSeriesIds?: number[];
    selectedSpeakerIds?: number[];
    selectedBookIds?: number[];
    selectedServiceTypeIds?: number[];
    from?: string;
    to?: string;
}

export function useSeriesTypes(params: UseSeriesTypesParams) {
    const {
        config,
        search,
        selectedSeriesIds = [],
        selectedSpeakerIds = [],
        selectedBookIds = [],
        selectedServiceTypeIds = [],
        from,
        to,
    } = params;

    const seriesId =
        selectedSeriesIds.length > 0 ? selectedSeriesIds.join(',') : undefined;
    const speakerId =
        selectedSpeakerIds.length > 0 ?
            selectedSpeakerIds.join(',')
        :   undefined;
    const bookId =
        selectedBookIds.length > 0 ? selectedBookIds.join(',') : undefined;
    const serviceTypeId =
        selectedServiceTypeIds.length > 0 ?
            selectedServiceTypeIds.join(',')
        :   undefined;

    return useQuery({
        queryKey: [
            'series-types',
            config.apiUrl,
            { search, seriesId, speakerId, bookId, serviceTypeId, from, to },
        ],
        queryFn: async () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            const { data, error } = await client.GET(
                '/api/sermons/series-types',
                {
                    params: {
                        query: {
                            search: search || undefined,
                            seriesId,
                            speakerId,
                            bookId,
                            serviceTypeId,
                            from: from || undefined,
                            to: to || undefined,
                        },
                    },
                },
            );
            if (error)
                throw createApiError('Failed to fetch series types', error);
            return data.data;
        },
    });
}
