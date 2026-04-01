import {
    parseAsInteger,
    parseAsString,
    parseAsStringLiteral,
    useQueryStates,
} from 'nuqs';
import type { SortField, SortOrder, TabId, ScreenMode } from '../types';

const sermonParams = {
    tab: parseAsStringLiteral(['sermons', 'series'] as const).withDefault(
        'sermons',
    ),
    screen: parseAsStringLiteral(['browse', 'detail'] as const).withDefault(
        'browse',
    ),
    id: parseAsInteger,
    search: parseAsString.withDefault(''),
    series: parseAsString,
    speaker: parseAsString,
    book: parseAsString,
    serviceTypes: parseAsString,
    from: parseAsString,
    to: parseAsString,
    sort: parseAsStringLiteral(['date', 'title'] as const).withDefault('date'),
    order: parseAsStringLiteral(['asc', 'desc'] as const).withDefault('desc'),
    page: parseAsInteger.withDefault(1),
};

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

function toggleId(current: number[], id: number): number[] {
    return current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
}

export function useSermonFilters() {
    const [params, setParams] = useQueryStates(sermonParams, {
        history: 'push',
    });

    const setTab = (tab: TabId) => {
        if (tab === 'compilations') return;
        setParams({
            tab: tab as 'sermons' | 'series',
            screen: 'browse',
            id: null,
            page: 1,
        });
    };

    const setScreen = (screen: ScreenMode, id?: number) => {
        setParams({ screen, id: id ?? null });
    };

    const setSearch = (search: string) => {
        setParams({ search: search || null, page: 1 });
    };

    // Multi-select toggles for all filter dropdowns
    const selectedSeriesIds = parseIds(params.series);
    const selectedSpeakerIds = parseIds(params.speaker);
    const selectedBookIds = parseIds(params.book);
    const selectedServiceTypeIds = parseIds(params.serviceTypes);

    const toggleSeries = (id: number) => {
        setParams({
            series: serializeIds(toggleId(selectedSeriesIds, id)),
            page: 1,
        });
    };

    const toggleSpeaker = (id: number) => {
        setParams({
            speaker: serializeIds(toggleId(selectedSpeakerIds, id)),
            page: 1,
        });
    };

    const toggleBook = (id: number) => {
        setParams({
            book: serializeIds(toggleId(selectedBookIds, id)),
            page: 1,
        });
    };

    const toggleServiceType = (id: number) => {
        setParams({
            serviceTypes: serializeIds(toggleId(selectedServiceTypeIds, id)),
            page: 1,
        });
    };

    const clearSeries = () => {
        setParams({ series: null, page: 1 });
    };

    const clearSpeaker = () => {
        setParams({ speaker: null, page: 1 });
    };

    const clearBook = () => {
        setParams({ book: null, page: 1 });
    };

    const clearServiceTypes = () => {
        setParams({ serviceTypes: null, page: 1 });
    };

    const setDateRange = (from: string | null, to: string | null) => {
        setParams({ from: from || null, to: to || null, page: 1 });
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
            series: null,
            speaker: null,
            book: null,
            serviceTypes: null,
            from: null,
            to: null,
            sort: 'date',
            order: 'desc',
            page: 1,
        });
    };

    const hasActiveFilters =
        !!params.search
        || selectedSeriesIds.length > 0
        || selectedSpeakerIds.length > 0
        || selectedBookIds.length > 0
        || selectedServiceTypeIds.length > 0
        || params.from !== null
        || params.to !== null;

    return {
        ...params,
        selectedSeriesIds,
        selectedSpeakerIds,
        selectedBookIds,
        selectedServiceTypeIds,
        setTab,
        setScreen,
        setSearch,
        toggleSeries,
        toggleSpeaker,
        toggleBook,
        toggleServiceType,
        clearSeries,
        clearSpeaker,
        clearBook,
        clearServiceTypes,
        setDateRange,
        setSort,
        setPage,
        clearFilters,
        hasActiveFilters,
    };
}
