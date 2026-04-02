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
function parseServiceTypeIds(value: string | null): number[] {
    if (!value) return [];
    return value
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);
}

/** Serialize number array into comma-separated string */
function serializeServiceTypeIds(ids: number[]): string | null {
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
            series: parseAsInteger,
            speaker: parseAsInteger,
            book: parseAsInteger,
            serviceTypes: parseAsString,
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
    const series = config.seriesId || params.series;
    const speaker = config.speakerId || params.speaker;
    const book = config.bookId || params.book;
    const from = config.from || params.from;
    const to = config.to || params.to;

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

    const setSeries =
        config.seriesId ?
            (_seriesId: number | null) => {}
        :   (seriesId: number | null) => {
                setParams({ series: seriesId, page: 1 });
            };

    const setSpeaker =
        config.speakerId ?
            (_speakerId: number | null) => {}
        :   (speakerId: number | null) => {
                setParams({ speaker: speakerId, page: 1 });
            };

    const setBook =
        config.bookId ?
            (_bookId: number | null) => {}
        :   (bookId: number | null) => {
                setParams({ book: bookId, page: 1 });
            };

    const toggleServiceType = (id: number) => {
        const current = parseServiceTypeIds(params.serviceTypes);
        const next =
            current.includes(id) ?
                current.filter((x) => x !== id)
            :   [...current, id];
        setParams({ serviceTypes: serializeServiceTypeIds(next), page: 1 });
    };

    const clearServiceTypes = () => {
        setParams({ serviceTypes: null, page: 1 });
    };

    const setServiceTypes = (ids: number[]) => {
        setParams({ serviceTypes: serializeServiceTypeIds(ids), page: 1 });
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

    const selectedServiceTypeIds = parseServiceTypeIds(params.serviceTypes);

    const clearFilters = () => {
        setParams({
            search: null,
            series: config.seriesId ? undefined : null,
            speaker: config.speakerId ? undefined : null,
            book: config.bookId ? undefined : null,
            serviceTypes: null,
            from: config.from ? undefined : null,
            to: config.to ? undefined : null,
            sort: 'date',
            order: 'desc',
            page: 1,
        });
    };

    const hasActiveFilters =
        !!params.search
        || (!config.seriesId && params.series !== null)
        || (!config.speakerId && params.speaker !== null)
        || (!config.bookId && params.book !== null)
        || selectedServiceTypeIds.length > 0
        || (!config.from && params.from !== null)
        || (!config.to && params.to !== null);

    return {
        ...params,
        tab,
        series,
        speaker,
        book,
        from,
        to,
        selectedServiceTypeIds,
        setTab,
        setScreen,
        setSermonFromSeries,
        setSeriesDetail,
        setSearch,
        setSeries,
        setSpeaker,
        setBook,
        toggleServiceType,
        clearServiceTypes,
        setServiceTypes,
        setDateRange,
        setSort,
        setPage,
        clearFilters,
        hasActiveFilters,
    };
}
