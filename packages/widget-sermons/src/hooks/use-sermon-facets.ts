import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SermonsConfig, SortField, SortOrder } from '../types';

export interface UseSermonFacetsParams {
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
    config: SermonsConfig;
}

export interface SermonFacets {
    seriesIds: Set<number>;
    speakerIds: Set<number>;
    bookIds: Set<number>;
}

/**
 * Fetches a large page of sermons with current filters to extract
 * which series/speaker/book IDs are available in the result set.
 * Used to hide dropdown options that would yield no results.
 */
export function useSermonFacets(params: UseSermonFacetsParams): SermonFacets {
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
        config,
    } = params;

    const resolvedServiceTypeId =
        selectedServiceTypeIds.length > 0
            ? selectedServiceTypeIds.join(',')
            : (serviceTypeId ?? undefined);

    const seriesId =
        selectedSeriesIds.length > 0 ? selectedSeriesIds[0] : undefined;
    const speakerId =
        selectedSpeakerIds.length > 0 ? selectedSpeakerIds[0] : undefined;
    const bookId =
        selectedBookIds.length > 0 ? selectedBookIds[0] : undefined;

    const hasFilters =
        !!search
        || seriesId !== undefined
        || speakerId !== undefined
        || bookId !== undefined
        || resolvedServiceTypeId !== undefined
        || !!from
        || !!to;

    const { data } = useQuery({
        queryKey: [
            'sermon-facets',
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
                        page: 1,
                        perPage: 10000,
                        serviceTypeId: resolvedServiceTypeId,
                    } as Record<string, unknown>,
                },
            });
            if (error) return { seriesIds: [], speakerIds: [], bookIds: [] };

            const seriesIdSet = new Set<number>();
            const speakerIdSet = new Set<number>();
            const bookIdSet = new Set<number>();

            for (const s of data.data.sermons) {
                seriesIdSet.add(s.series.id);
                speakerIdSet.add(s.speaker.id);
            }

            return {
                seriesIds: [...seriesIdSet],
                speakerIds: [...speakerIdSet],
                bookIds: [...bookIdSet],
            };
        },
        enabled: hasFilters,
        staleTime: 2 * 60 * 1000,
    });

    if (!hasFilters || !data) {
        return {
            seriesIds: new Set(),
            speakerIds: new Set(),
            bookIds: new Set(),
        };
    }

    return {
        seriesIds: new Set(data.seriesIds),
        speakerIds: new Set(data.speakerIds),
        bookIds: new Set(data.bookIds),
    };
}
