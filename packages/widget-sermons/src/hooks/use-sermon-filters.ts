import {
    parseAsInteger,
    parseAsString,
    parseAsStringLiteral,
    useQueryStates,
} from 'nuqs';
import type { SortField, SortOrder, TabId, ScreenMode } from '../types';

const sermonParams = {
    tab: parseAsStringLiteral(['sermons', 'series'] as const).withDefault('sermons'),
    screen: parseAsStringLiteral(['browse', 'detail'] as const).withDefault('browse'),
    id: parseAsInteger,
    search: parseAsString.withDefault(''),
    series: parseAsInteger,
    speaker: parseAsInteger,
    book: parseAsInteger,
    campus: parseAsInteger,
    from: parseAsString,
    to: parseAsString,
    sort: parseAsStringLiteral(['date', 'title'] as const).withDefault('date'),
    order: parseAsStringLiteral(['asc', 'desc'] as const).withDefault('desc'),
    page: parseAsInteger.withDefault(1),
};

export function useSermonFilters() {
    const [params, setParams] = useQueryStates(sermonParams, {
        history: 'push',
    });

    const setTab = (tab: TabId) => {
        if (tab === 'compilations') return;
        setParams({ tab: tab as 'sermons' | 'series', screen: 'browse', id: null, page: 1 });
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

    const setCampus = (campusId: number | null) => {
        setParams({ campus: campusId, page: 1 });
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
            search: null, series: null, speaker: null, book: null,
            campus: null, from: null, to: null, sort: 'date', order: 'desc', page: 1,
        });
    };

    const hasActiveFilters =
        !!params.search ||
        params.series !== null ||
        params.speaker !== null ||
        params.book !== null ||
        params.campus !== null ||
        params.from !== null ||
        params.to !== null;

    return {
        ...params,
        setTab, setScreen, setSearch, setSeries, setSpeaker,
        setBook, setCampus, setDateRange, setSort, setPage,
        clearFilters, hasActiveFilters,
    };
}
