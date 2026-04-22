import { useMemo } from 'react';
import {
    parseAsInteger,
    parseAsString,
    parseAsStringLiteral,
    useQueryStates,
} from 'nuqs';
import type {
    SermonsConfig,
    SortField,
    SortOrder,
    TabId,
    ScreenMode,
} from '../types';

/** Parse comma-separated IDs string into number array */
function parseIds(value: string | null): number[] {
    if (!value) return [];
    return value
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);
}

/** Serialize number array into comma-separated string */
function serializeIds(ids: number[]): string | null {
    return ids.length > 0 ? ids.join(',') : null;
}

export function useSermonFilters(config: SermonsConfig) {
    const defaultTab = config.defaultTab ?? 'sermons';
    const sermonParams = useMemo(
        () => ({
            tab: parseAsStringLiteral([
                'sermons',
                'series',
            ] as const).withDefault(defaultTab),
            screen: parseAsStringLiteral([
                'browse',
                'detail',
            ] as const).withDefault('browse'),
            id: parseAsInteger,
            fromSeriesId: parseAsInteger,
            search: parseAsString.withDefault(''),
            series: parseAsString,
            speaker: parseAsString,
            book: parseAsString,
            serviceTypes: parseAsString,
            seriesType: parseAsString,
            from: parseAsString,
            to: parseAsString,
            sort: parseAsStringLiteral([
                'date',
                'title',
                'count',
            ] as const).withDefault('date'),
            order: parseAsStringLiteral(['asc', 'desc'] as const).withDefault(
                'desc',
            ),
            page: parseAsInteger.withDefault(1),
        }),
        [defaultTab],
    );

    const [params, setParams] = useQueryStates(sermonParams, {
        history: 'push',
    });

    // Override return values for locked params.
    // Empty strings from data-* attributes mean "not set" — treat as falsy.
    const tab = config.tab || params.tab;
    const from = config.from || params.from;
    const to = config.to || params.to;

    // Parse comma-separated IDs for multi-select filters, with config overrides.
    // Config values may be numbers (from parseDataAttributes coercion) — coerce to string.
    const selectedSeriesIds = parseIds(
        (config.seriesId ? String(config.seriesId) : null) || params.series,
    );
    const selectedSpeakerIds = parseIds(
        (config.speakerId ? String(config.speakerId) : null) || params.speaker,
    );
    const selectedBookIds = parseIds(
        (config.bookId ? String(config.bookId) : null) || params.book,
    );
    const selectedServiceTypeIds = parseIds(params.serviceTypes);
    const selectedSeriesTypeIds = parseIds(
        (config.seriesTypeId ? String(config.seriesTypeId) : null)
            || params.seriesType,
    );

    const setTab =
        config.tab ?
            (_tab: TabId) => {}
        :   (newTab: TabId) => {
                setParams({
                    tab: newTab,
                    screen: 'browse',
                    id: null,
                    page: 1,
                });
            };

    const setScreen = (screen: ScreenMode, id?: number) => {
        setParams({ screen, id: id ?? null, fromSeriesId: null });
    };

    /** Navigate from a series detail to a sermon detail, remembering the series */
    const setSermonFromSeries = (sermonId: number, seriesId: number) => {
        setParams({
            tab: config.tab || 'series',
            screen: 'detail',
            id: sermonId,
            fromSeriesId: seriesId,
        });
    };

    /** Navigate to a series detail view */
    const setSeriesDetail = (seriesId: number) => {
        setParams({
            tab: config.tab || 'series',
            screen: 'detail',
            id: seriesId,
            fromSeriesId: null,
        });
    };

    const setSearch = (search: string) => {
        setParams({ search: search || null, page: 1 });
    };

    const setSeriesIds =
        config.seriesId ?
            (_ids: number[]) => {}
        :   (ids: number[]) => {
                setParams({ series: serializeIds(ids), page: 1 });
            };

    const setSpeakerIds =
        config.speakerId ?
            (_ids: number[]) => {}
        :   (ids: number[]) => {
                setParams({ speaker: serializeIds(ids), page: 1 });
            };

    const setBookIds =
        config.bookId ?
            (_ids: number[]) => {}
        :   (ids: number[]) => {
                setParams({ book: serializeIds(ids), page: 1 });
            };

    const setServiceTypes = (ids: number[]) => {
        setParams({ serviceTypes: serializeIds(ids), page: 1 });
    };

    const setSeriesTypeIds =
        config.seriesTypeId ?
            (_ids: number[]) => {}
        :   (ids: number[]) => {
                setParams({ seriesType: serializeIds(ids), page: 1 });
            };

    const setDateRange =
        config.from || config.to ?
            (_from: string | null, _to: string | null) => {}
        :   (newFrom: string | null, newTo: string | null) => {
                setParams({
                    from: newFrom || null,
                    to: newTo || null,
                    page: 1,
                });
            };

    const setSort = (sort: SortField, order: SortOrder) => {
        setParams({ sort, order, page: 1 });
    };

    const setPage = (page: number) => {
        setParams({ page });
    };

    const clearFilters = () => {
        setParams({
            search: null,
            series: config.seriesId ? undefined : null,
            speaker: config.speakerId ? undefined : null,
            book: config.bookId ? undefined : null,
            serviceTypes: null,
            seriesType: config.seriesTypeId ? undefined : null,
            from: config.from ? undefined : null,
            to: config.to ? undefined : null,
            sort: 'date',
            order: 'desc',
            page: 1,
        });
    };

    const hasActiveFilters =
        !!params.search
        || (!config.seriesId && selectedSeriesIds.length > 0)
        || (!config.speakerId && selectedSpeakerIds.length > 0)
        || (!config.bookId && selectedBookIds.length > 0)
        || selectedServiceTypeIds.length > 0
        || (!config.seriesTypeId && selectedSeriesTypeIds.length > 0)
        || (!config.from && params.from !== null)
        || (!config.to && params.to !== null);

    return {
        ...params,
        tab,
        from,
        to,
        selectedSeriesIds,
        selectedSpeakerIds,
        selectedBookIds,
        selectedServiceTypeIds,
        selectedSeriesTypeIds,
        setTab,
        setScreen,
        setSermonFromSeries,
        setSeriesDetail,
        setSearch,
        setSeriesIds,
        setSpeakerIds,
        setBookIds,
        setServiceTypes,
        setSeriesTypeIds,
        setDateRange,
        setSort,
        setPage,
        clearFilters,
        hasActiveFilters,
    };
}
