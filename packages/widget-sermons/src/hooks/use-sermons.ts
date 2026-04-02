import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SortField, SortOrder } from '../types';
import type { SermonsConfig } from '../types';
import { createApiError } from '../lib/api-error';

export interface UseSermonsParams {
    search?: string;
    series?: number | null;
    speaker?: number | null;
    book?: number | null;
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
        series,
        speaker,
        book,
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
        selectedServiceTypeIds.length > 0 ?
            selectedServiceTypeIds.join(',')
        :   (serviceTypeId ?? undefined);

    // Sermons API only supports 'date' | 'title' — fall back to 'date' for 'count'
    const sermonSort = sort === 'count' ? 'date' : sort;

    return useQuery({
        queryKey: [
            'sermons',
            {
                search,
                series,
                speaker,
                book,
                serviceTypeId: resolvedServiceTypeId,
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
                        seriesId: series ?? undefined,
                        speakerId: speaker ?? undefined,
                        bookId: book ?? undefined,
                        from: from ?? undefined,
                        to: to ?? undefined,
                        sort: sermonSort,
                        order,
                        page,
                        perPage: config.perPage,
                        serviceTypeId: resolvedServiceTypeId,
                    },
                },
            });
            if (error) throw createApiError('Failed to fetch sermons', error);
            return data.data;
        },
    });
}
