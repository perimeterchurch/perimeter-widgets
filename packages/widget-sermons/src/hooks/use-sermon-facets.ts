import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SermonsConfig } from '../types';

export interface UseSermonFacetsParams {
    search?: string;
    selectedSeriesIds: number[];
    selectedSpeakerIds: number[];
    selectedBookIds: number[];
    selectedServiceTypeIds: number[];
    serviceTypeId?: string;
    from?: string | null;
    to?: string | null;
    config: SermonsConfig;
}

interface SermonStub {
    series: { id: number };
    speaker: { id: number };
}

export interface SermonFacets {
    seriesIds: Set<number>;
    speakerIds: Set<number>;
}

/**
 * Fetches all sermons matching the cross-cutting filters (search, date
 * range, service type) WITHOUT the dropdown-specific filters. Then
 * derives per-dropdown available IDs by applying the OTHER dropdowns
 * client-side. This way each dropdown only shows options that would
 * actually produce results given the other selections.
 */
export function useSermonFacets(params: UseSermonFacetsParams): SermonFacets {
    const {
        search,
        selectedSeriesIds,
        selectedSpeakerIds,
        selectedServiceTypeIds,
        serviceTypeId,
        from,
        to,
        config,
    } = params;

    const resolvedServiceTypeId =
        selectedServiceTypeIds.length > 0
            ? selectedServiceTypeIds.join(',')
            : (serviceTypeId ?? undefined);

    const hasAnyFilter =
        !!search
        || selectedSeriesIds.length > 0
        || selectedSpeakerIds.length > 0
        || selectedServiceTypeIds.length > 0
        || resolvedServiceTypeId !== undefined
        || !!from
        || !!to;

    // Fetch ALL sermons matching cross-cutting filters only (no series/speaker/book filter)
    const { data: allSermons } = useQuery({
        queryKey: [
            'sermon-facets-base',
            { search, serviceTypeId: resolvedServiceTypeId, from, to },
        ],
        queryFn: async () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            const { data, error } = await client.GET('/api/sermons', {
                params: {
                    query: {
                        search: search || undefined,
                        from: from ?? undefined,
                        to: to ?? undefined,
                        page: 1,
                        perPage: 10000,
                        serviceTypeId: resolvedServiceTypeId,
                    } as Record<string, unknown>,
                },
            });
            if (error) return [];
            return data.data.sermons as SermonStub[];
        },
        enabled: hasAnyFilter,
        staleTime: 2 * 60 * 1000,
    });

    // For series dropdown: filter by selected speakers (but NOT by selected series)
    const seriesIds = useMemo(() => {
        if (!allSermons || !hasAnyFilter) return new Set<number>();
        let filtered = allSermons;
        if (selectedSpeakerIds.length > 0) {
            const speakerSet = new Set(selectedSpeakerIds);
            filtered = filtered.filter((s) => speakerSet.has(s.speaker.id));
        }
        return new Set(filtered.map((s) => s.series.id));
    }, [allSermons, selectedSpeakerIds, hasAnyFilter]);

    // For speaker dropdown: filter by selected series (but NOT by selected speakers)
    const speakerIds = useMemo(() => {
        if (!allSermons || !hasAnyFilter) return new Set<number>();
        let filtered = allSermons;
        if (selectedSeriesIds.length > 0) {
            const seriesSet = new Set(selectedSeriesIds);
            filtered = filtered.filter((s) => seriesSet.has(s.series.id));
        }
        return new Set(filtered.map((s) => s.speaker.id));
    }, [allSermons, selectedSeriesIds, hasAnyFilter]);

    return { seriesIds, speakerIds };
}
