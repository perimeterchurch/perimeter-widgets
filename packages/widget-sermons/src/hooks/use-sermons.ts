import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SortField, SortOrder } from '../types';
import type { SermonsConfig } from '../types';

export interface UseSermonsParams {
    search?: string;
    selectedSeriesIds?: number[];
    selectedSpeakerIds?: number[];
    selectedBookIds?: number[];
    selectedServiceTypeIds?: number[];
    serviceTypeId?: string;
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
        serviceTypeId,
        from,
        to,
        sort = 'date',
        order = 'desc',
        page = 1,
        config,
    } = params;

    // Merge: UI filter selection takes priority, then config-resolved IDs
    const resolvedServiceTypeId =
        selectedServiceTypeIds.length > 0
            ? selectedServiceTypeIds.join(',')
            : (serviceTypeId ?? undefined);

    // For series/speaker/book, use first selected ID (API supports single filter)
    const seriesId =
        selectedSeriesIds.length > 0 ? selectedSeriesIds[0] : undefined;
    const speakerId =
        selectedSpeakerIds.length > 0 ? selectedSpeakerIds[0] : undefined;
    const bookId =
        selectedBookIds.length > 0 ? selectedBookIds[0] : undefined;

    return useQuery({
        queryKey: [
            'sermons',
            {
                search,
                seriesId,
                speakerId,
                bookId,
                serviceTypeId: resolvedServiceTypeId,
                from,
                to,
                sort,
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
                        sort,
                        order,
                        page,
                        perPage: config.perPage,
                        serviceTypeId: resolvedServiceTypeId,
                    } as Record<string, unknown>,
                },
            });
            if (error) throw new Error('Failed to fetch sermons');
            return data.data;
        },
    });
}
