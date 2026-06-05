import { useMemo } from 'react';
import {
  debounce,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';
import type { SermonsConfig, SortField, SortOrder, TabId, ScreenMode } from '../types';

/**
 * Per-embed URL-key prefix. nuqs v2's adapter exposes no global prefix, so we
 * namespace each query-state key to its own URL parameter via `useQueryStates`'
 * `urlKeys` option. Passing a non-empty `prefix` makes `tab` → `<prefix>tab`,
 * etc., so two sermons embeds on one page never collide on URL params.
 */
export interface UseSermonFiltersOptions {
  prefix?: string | undefined;
}

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

export function useSermonFilters(config: SermonsConfig, options: UseSermonFiltersOptions = {}) {
  const { prefix } = options;
  const defaultTab = config.defaultTab ?? 'sermons';
  const sermonParams = useMemo(
    () => ({
      tab: parseAsStringLiteral(['sermons', 'series'] as const).withDefault(defaultTab),
      screen: parseAsStringLiteral(['browse', 'detail'] as const).withDefault('browse'),
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
      sort: parseAsStringLiteral(['date', 'title', 'count'] as const).withDefault('date'),
      order: parseAsStringLiteral(['asc', 'desc'] as const).withDefault('desc'),
      page: parseAsInteger.withDefault(1),
    }),
    [defaultTab],
  );

  // Map each state key to a prefixed URL param so multiple embeds don't
  // collide. With no prefix the keys map to themselves (identity).
  const urlKeys = useMemo(() => {
    if (!prefix) return undefined;
    return Object.fromEntries(
      Object.keys(sermonParams).map((key) => [key, `${prefix}${key}`]),
    ) as Record<keyof typeof sermonParams, string>;
  }, [prefix, sermonParams]);

  const [params, setParams] = useQueryStates(sermonParams, {
    history: 'push',
    ...(urlKeys ? { urlKeys } : {}),
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
  const selectedBookIds = parseIds((config.bookId ? String(config.bookId) : null) || params.book);
  const selectedServiceTypeIds = parseIds(params.serviceTypes);
  const selectedSeriesTypeIds = parseIds(
    (config.seriesTypeId ? String(config.seriesTypeId) : null) || params.seriesType,
  );

  // No-op used for locked setters — the embedder pinned this dimension, so
  // user-initiated changes are intentionally ignored.
  const noop = () => {};

  const setTab: (tab: TabId) => void = config.tab
    ? noop
    : (newTab: TabId) => {
        void setParams({
          tab: newTab,
          screen: 'browse',
          id: null,
          page: 1,
        });
      };

  const setScreen = (screen: ScreenMode, id?: number) => {
    void setParams({ screen, id: id ?? null, fromSeriesId: null });
  };

  /** Navigate from a series detail to a sermon detail, remembering the series */
  const setSermonFromSeries = (sermonId: number, seriesId: number) => {
    void setParams({
      tab: config.tab || 'series',
      screen: 'detail',
      id: sermonId,
      fromSeriesId: seriesId,
    });
  };

  /** Navigate to a series detail view */
  const setSeriesDetail = (seriesId: number) => {
    void setParams({
      tab: config.tab || 'series',
      screen: 'detail',
      id: seriesId,
      fromSeriesId: null,
    });
  };

  // The input stays fully responsive (nuqs updates the returned `search` value
  // optimistically on every keystroke); only the URL write is debounced so we
  // don't push a history entry / query per character. `history: 'replace'`
  // overrides the hook-global `history: 'push'` so typing never spams the back
  // stack, and `shallow: false` is the documented pairing for `debounce`.
  const setSearch = (search: string) => {
    void setParams(
      { search: search || null, page: 1 },
      { history: 'replace', shallow: false, limitUrlUpdates: debounce(300) },
    );
  };

  const setSeriesIds: (ids: number[]) => void = config.seriesId
    ? noop
    : (ids: number[]) => {
        void setParams({ series: serializeIds(ids), page: 1 });
      };

  const setSpeakerIds: (ids: number[]) => void = config.speakerId
    ? noop
    : (ids: number[]) => {
        void setParams({ speaker: serializeIds(ids), page: 1 });
      };

  const setBookIds: (ids: number[]) => void = config.bookId
    ? noop
    : (ids: number[]) => {
        void setParams({ book: serializeIds(ids), page: 1 });
      };

  const setServiceTypes = (ids: number[]) => {
    void setParams({ serviceTypes: serializeIds(ids), page: 1 });
  };

  const setSeriesTypeIds: (ids: number[]) => void = config.seriesTypeId
    ? noop
    : (ids: number[]) => {
        void setParams({ seriesType: serializeIds(ids), page: 1 });
      };

  const setDateRange: (from: string | null, to: string | null) => void =
    config.from || config.to
      ? noop
      : (newFrom: string | null, newTo: string | null) => {
          void setParams({
            from: newFrom || null,
            to: newTo || null,
            page: 1,
          });
        };

  const setSort = (sort: SortField, order: SortOrder) => {
    void setParams({ sort, order, page: 1 });
  };

  const setPage = (page: number) => {
    void setParams({ page });
  };

  const clearFilters = () => {
    // Locked dimensions are omitted entirely (a `null` would clear their
    // pinned value); only unlocked dimensions are reset to `null`.
    const next: Parameters<typeof setParams>[0] = {
      search: null,
      serviceTypes: null,
      sort: 'date',
      order: 'desc',
      page: 1,
    };
    if (!config.seriesId) next.series = null;
    if (!config.speakerId) next.speaker = null;
    if (!config.bookId) next.book = null;
    if (!config.seriesTypeId) next.seriesType = null;
    if (!config.from) next.from = null;
    if (!config.to) next.to = null;
    void setParams(next);
  };

  const hasActiveFilters =
    !!params.search ||
    (!config.seriesId && selectedSeriesIds.length > 0) ||
    (!config.speakerId && selectedSpeakerIds.length > 0) ||
    (!config.bookId && selectedBookIds.length > 0) ||
    selectedServiceTypeIds.length > 0 ||
    (!config.seriesTypeId && selectedSeriesTypeIds.length > 0) ||
    (!config.from && params.from !== null) ||
    (!config.to && params.to !== null);

  // A filter is "locked" when the embedder either pinned it via a data-*
  // attribute (e.g. data-series-id) or hid it via data-hide-* — the
  // setters above already no-op in those cases as defense-in-depth, but
  // consumers also need to know the lock state to suppress UI affordances.
  const lockedFilters = new Set<string>();
  if (config.seriesId || config.hideSeries) lockedFilters.add('series');
  if (config.speakerId || config.hideSpeaker) lockedFilters.add('speaker');
  if (config.bookId || config.hideBook) lockedFilters.add('book');
  if (config.serviceTypeId || config.hideServiceType) lockedFilters.add('serviceTypes');
  if (config.seriesTypeId || config.hideSeriesType) lockedFilters.add('seriesType');
  if (config.from || config.hideDate) lockedFilters.add('from');
  if (config.to || config.hideDate) lockedFilters.add('to');
  if (config.hideSearch) lockedFilters.add('search');

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
    lockedFilters,
  };
}
