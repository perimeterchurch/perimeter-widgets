import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SortField, SortOrder } from '../types';
import type { SermonsConfig } from '../types';
import { createApiError } from '../lib/api-error';

export interface UseSermonsParams {
    search?: string;
    selectedSeriesIds?: number[];
    selectedSpeakerIds?: number[];
    selectedBookIds?: number[];
    selectedServiceTypeIds?: number[];
    selectedSeriesTypeIds?: number[];
    from?: string | null;
    to?: string | null;
    sort?: SortField;
    order?: SortOrder;
    page?: number;
    config: SermonsConfig;
}

export function useSermons(params: UseSermonsParams) {
    const {
        search,
        selectedSeriesIds = [],
        selectedSpeakerIds = [],
        selectedBookIds = [],
        selectedServiceTypeIds = [],
        selectedSeriesTypeIds = [],
        from,
        to,
        sort = 'date',
        order = 'desc',
        page = 1,
        config,
    } = params;

    const resolvedServiceTypeId =
        selectedServiceTypeIds.length > 0 ?
            selectedServiceTypeIds.join(',')
        :   undefined;

    const resolvedSeriesTypeId =
        selectedSeriesTypeIds.length > 0 ?
            selectedSeriesTypeIds.join(',')
        :   undefined;

    const seriesId =
        selectedSeriesIds.length > 0 ? selectedSeriesIds.join(',') : undefined;
    const speakerId =
        selectedSpeakerIds.length > 0 ?
            selectedSpeakerIds.join(',')
        :   undefined;
    const bookId =
        selectedBookIds.length > 0 ? selectedBookIds.join(',') : undefined;

    // Sermons API only supports 'date' | 'title' — fall back to 'date' for 'count'
    const sermonSort = sort === 'count' ? 'date' : sort;

    return useQuery({
        queryKey: [
            'sermons',
            {
                search,
                seriesId,
                speakerId,
                bookId,
                serviceTypeId: resolvedServiceTypeId,
                seriesTypeId: resolvedSeriesTypeId,
                from,
                to,
                sort: sermonSort,
                order,
                page,
                perPage: config.perPage,
            },
        ],
        queryFn: async () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            const { data, error } = await client.GET('/api/sermons', {
                params: {
                    query: {
                        search: search || undefined,
                        seriesId,
                        speakerId,
                        bookId,
                        from: from ?? undefined,
                        to: to ?? undefined,
                        sort: sermonSort,
                        order,
                        page,
                        perPage: config.perPage,
                        serviceTypeId: resolvedServiceTypeId,
                        seriesTypeId: resolvedSeriesTypeId,
                    },
                },
            });
            if (error) throw createApiError('Failed to fetch sermons', error);
            return data.data;
        },
    });
}
