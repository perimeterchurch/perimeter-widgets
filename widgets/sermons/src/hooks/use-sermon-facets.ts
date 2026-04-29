import { useEffect, useMemo } from 'react';
import type { SermonsConfig } from '../types';
import { useBooks } from './use-books';
import { useSeries } from './use-series';
import { useSeriesTypes } from './use-series-types';
import { useServiceTypes } from './use-service-types';
import { useSpeakers } from './use-speakers';
import type { FilterLabelCache } from './use-filter-label-cache';
import type { useSermonFilters } from './use-sermon-filters';

interface UseSermonFacetsParams {
    config: SermonsConfig;
    filters: ReturnType<typeof useSermonFilters>;
    labelCache: FilterLabelCache;
}

/**
 * Bundles the two facet-fetch concerns the sermons widget needs:
 *
 * 1. **Primer fetches** (unfiltered) populate `labelCache` so a chip whose
 *    underlying option got narrowed out of the visible list still renders
 *    with its label intact. Fired-and-forgot — only their absorb effects
 *    matter to the UI.
 *
 * 2. **Narrowed fetches** apply the current filters from every *other*
 *    dimension. These are what the dropdowns actually display.
 *
 * Returns only the narrowed results — the primer queries are observed only
 * by their absorb effects.
 */
export function useSermonFacets({
    config,
    filters,
    labelCache,
}: UseSermonFacetsParams) {
    // --- Primer queries (unfiltered) ---
    const { data: allSpeakers = [] } = useSpeakers({ config });
    const { data: allBooks = [] } = useBooks({ config });
    const { data: allServiceTypes = [] } = useServiceTypes({ config });
    const { data: allSeriesTypes = [] } = useSeriesTypes({ config });
    const { data: allSeriesPage } = useSeries({ config, perPage: 50 });
    const allSeriesItems = useMemo(
        () => allSeriesPage?.series ?? [],
        [allSeriesPage?.series],
    );

    // Absorb primer results into the label cache via effects — inline absorb
    // would fire twice under React StrictMode's double-render.
    useEffect(() => {
        labelCache.absorb(
            'speaker',
            allSpeakers.map((s) => ({ id: s.id, label: s.name })),
        );
    }, [allSpeakers, labelCache]);
    useEffect(() => {
        labelCache.absorb(
            'book',
            allBooks.map((b) => ({ id: b.id, label: b.name })),
        );
    }, [allBooks, labelCache]);
    useEffect(() => {
        labelCache.absorb(
            'series',
            allSeriesItems.map((s) => ({
                id: s.id,
                label: s.displayTitle ?? s.title,
            })),
        );
    }, [allSeriesItems, labelCache]);
    useEffect(() => {
        labelCache.absorb(
            'serviceType',
            allServiceTypes.map((s) => ({ id: s.id, label: s.name })),
        );
    }, [allServiceTypes, labelCache]);
    useEffect(() => {
        labelCache.absorb(
            'seriesType',
            allSeriesTypes.map((s) => ({ id: s.id, label: s.name })),
        );
    }, [allSeriesTypes, labelCache]);

    // --- Narrowed queries (apply every other filter dimension) ---
    const { data: speakers = [], isLoading: speakersLoading } = useSpeakers({
        config,
        search: filters.search || undefined,
        selectedSeriesIds: filters.selectedSeriesIds,
        selectedBookIds: filters.selectedBookIds,
        selectedServiceTypeIds: filters.selectedServiceTypeIds,
        selectedSeriesTypeIds: filters.selectedSeriesTypeIds,
        from: filters.from ?? undefined,
        to: filters.to ?? undefined,
    });
    const { data: books = [], isLoading: booksLoading } = useBooks({
        config,
        search: filters.search || undefined,
        selectedSeriesIds: filters.selectedSeriesIds,
        selectedSpeakerIds: filters.selectedSpeakerIds,
        selectedServiceTypeIds: filters.selectedServiceTypeIds,
        selectedSeriesTypeIds: filters.selectedSeriesTypeIds,
        from: filters.from ?? undefined,
        to: filters.to ?? undefined,
    });
    const { data: serviceTypes = [], isLoading: serviceTypesLoading } =
        useServiceTypes({
            config,
            search: filters.search || undefined,
            selectedSeriesIds: filters.selectedSeriesIds,
            selectedSpeakerIds: filters.selectedSpeakerIds,
            selectedBookIds: filters.selectedBookIds,
            selectedSeriesTypeIds: filters.selectedSeriesTypeIds,
            from: filters.from ?? undefined,
            to: filters.to ?? undefined,
        });
    const { data: seriesTypes = [], isLoading: seriesTypesLoading } =
        useSeriesTypes({
            config,
            search: filters.search || undefined,
            selectedSeriesIds: filters.selectedSeriesIds,
            selectedSpeakerIds: filters.selectedSpeakerIds,
            selectedBookIds: filters.selectedBookIds,
            selectedServiceTypeIds: filters.selectedServiceTypeIds,
            from: filters.from ?? undefined,
            to: filters.to ?? undefined,
        });
    const { data: seriesPage, isLoading: seriesLoading } = useSeries({
        config,
        perPage: 50,
        search: filters.search || undefined,
        selectedSpeakerIds: filters.selectedSpeakerIds,
        selectedBookIds: filters.selectedBookIds,
        selectedServiceTypeIds: filters.selectedServiceTypeIds,
        selectedSeriesTypeIds: filters.selectedSeriesTypeIds,
        from: filters.from ?? undefined,
        to: filters.to ?? undefined,
    });
    const series = seriesPage?.series ?? [];

    return {
        speakers,
        books,
        serviceTypes,
        seriesTypes,
        series,
        speakersLoading,
        booksLoading,
        serviceTypesLoading,
        seriesTypesLoading,
        seriesLoading,
    };
}
