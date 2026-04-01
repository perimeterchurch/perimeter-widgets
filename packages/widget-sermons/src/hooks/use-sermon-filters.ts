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
    series: parseAsInteger,
    speaker: parseAsInteger,
    book: parseAsInteger,
    serviceTypes: parseAsString,
    from: parseAsString,
    to: parseAsString,
    sort: parseAsStringLiteral(['date', 'title'] as const).withDefault('date'),
    order: parseAsStringLiteral(['asc', 'desc'] as const).withDefault('desc'),
    page: parseAsInteger.withDefault(1),
};

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

    const setSeries = (seriesId: number | null) => {
        setParams({ series: seriesId, page: 1 });
    };

    const setSpeaker = (speakerId: number | null) => {
        setParams({ speaker: speakerId, page: 1 });
    };

    const setBook = (bookId: number | null) => {
        setParams({ book: bookId, page: 1 });
    };

    const toggleServiceType = (id: number) => {
        const current = parseServiceTypeIds(params.serviceTypes);
        const next = current.includes(id)
            ? current.filter((x) => x !== id)
            : [...current, id];
        setParams({ serviceTypes: serializeServiceTypeIds(next), page: 1 });
    };

    const clearServiceTypes = () => {
        setParams({ serviceTypes: null, page: 1 });
    };

    const setServiceTypes = (ids: number[]) => {
        setParams({ serviceTypes: serializeServiceTypeIds(ids), page: 1 });
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

    const selectedServiceTypeIds = parseServiceTypeIds(params.serviceTypes);

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
        || params.series !== null
        || params.speaker !== null
        || params.book !== null
        || selectedServiceTypeIds.length > 0
        || params.from !== null
        || params.to !== null;

    return {
        ...params,
        selectedServiceTypeIds,
        setTab,
        setScreen,
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
