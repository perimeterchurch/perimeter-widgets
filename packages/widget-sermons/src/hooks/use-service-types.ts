import { useQuery } from '@tanstack/react-query';
import { createApiClient, createApiError } from '@perimeter-widgets/shared';
import type { SermonsConfig } from '../types';

export interface UseServiceTypesParams {
    config: SermonsConfig;
    search?: string;
    selectedSeriesIds?: number[];
    selectedSpeakerIds?: number[];
    selectedBookIds?: number[];
    selectedSeriesTypeIds?: number[];
    from?: string;
    to?: string;
}

export function useServiceTypes(params: UseServiceTypesParams) {
    const {
        config,
        search,
        selectedSeriesIds = [],
        selectedSpeakerIds = [],
        selectedBookIds = [],
        selectedSeriesTypeIds = [],
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
    const seriesTypeId =
        selectedSeriesTypeIds.length > 0 ?
            selectedSeriesTypeIds.join(',')
        :   undefined;

    return useQuery({
        queryKey: [
            'service-types',
            config.apiUrl,
            { search, seriesId, speakerId, bookId, seriesTypeId, from, to },
        ],
        queryFn: async () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            const { data, error } = await client.GET(
                '/api/sermons/service-types',
                {
                    params: {
                        query: {
                            search: search || undefined,
                            seriesId,
                            speakerId,
                            bookId,
                            seriesTypeId,
                            from: from || undefined,
                            to: to || undefined,
                        },
                    },
                },
            );
            if (error)
                throw createApiError('Failed to fetch service types', error);
            return data.data;
        },
    });
}
