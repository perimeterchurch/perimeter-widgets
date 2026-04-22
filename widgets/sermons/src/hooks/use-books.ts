import { useQuery } from '@tanstack/react-query';
import { createApiClient, createApiError } from '@perimeter-widgets/shared';
import type { SermonsConfig } from '../types';

export interface UseBooksParams {
    config: SermonsConfig;
    search?: string;
    selectedSeriesIds?: number[];
    selectedSpeakerIds?: number[];
    selectedServiceTypeIds?: number[];
    selectedSeriesTypeIds?: number[];
    from?: string;
    to?: string;
}

export function useBooks(params: UseBooksParams) {
    const {
        config,
        search,
        selectedSeriesIds = [],
        selectedSpeakerIds = [],
        selectedServiceTypeIds = [],
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
            'books',
            config.apiUrl,
            {
                search,
                seriesId,
                speakerId,
                serviceTypeId,
                seriesTypeId,
                from,
                to,
            },
        ],
        queryFn: async () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            const { data, error } = await client.GET('/api/sermons/books', {
                params: {
                    query: {
                        search: search || undefined,
                        seriesId,
                        speakerId,
                        serviceTypeId,
                        seriesTypeId,
                        from: from || undefined,
                        to: to || undefined,
                    },
                },
            });
            if (error) throw createApiError('Failed to fetch books', error);
            return data.data;
        },
    });
}
