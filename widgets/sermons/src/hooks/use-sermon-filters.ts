import { useMemo } from 'react';
import {
  debounce,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';
import type { SermonsConfig, SortField, SortOrder, TabId, ScreenMode, ViewMode } from '../types';

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
  const defaultTab = config.defaultTab ?? 'series';
  const defaultView = config.defaultView ?? 'grid';
  const sermonParams = useMemo(
    () => ({
      tab: parseAsStringLiteral(['sermons', 'series'] as const).withDefault(defaultTab),
      // The open sermon. Its URL key is the bare `id`, unprefixed — see urlKeys.
      // It always means a sermon (never a series), whichever tab is the
      // default, so perimeter.org's `?id=5621` links always open that sermon.
      id: parseAsInteger,
      // The open series (its own key, so it never collides with a sermon id).
      seriesId: parseAsInteger,
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
      // Layout preference — persisted to the URL (like sort) so it survives a
      // reload or a tab switch instead of resetting to the default each time.
      // `large` is the pre-1.6 name of `list`, still read from old links.
      view: parseAsStringLiteral(['grid', 'list', 'large'] as const),
      page: parseAsInteger.withDefault(1),
    }),
    [defaultTab],
  );

  // Map each state key to a prefixed URL param so multiple embeds don't
  // collide. With no prefix the keys map to themselves (identity). The one
  // exception is `id`, always the bare `?id=`: an open sermon's URL is then
  // `/sermons/?id=5621`, the same shape as perimeter.org's existing
  // `/sermons/sermon-details/?id=5621` links, so the widget embedded on that
  // page opens them as-is.
  const urlKeys = useMemo(() => {
    if (!prefix) return undefined;
    return {
      ...Object.fromEntries(Object.keys(sermonParams).map((key) => [key, `${prefix}${key}`])),
      id: 'id',
    } as Record<keyof typeof sermonParams, string>;
  }, [prefix, sermonParams]);

  const [params, setParams] = useQueryStates(sermonParams, {
    history: 'push',
    ...(urlKeys ? { urlKeys } : {}),
  });

  // Override return values for locked params.
  // Empty strings from data-* attributes mean "not set" — treat as falsy.
  const tab = config.tab || params.tab;
  // A detail is open whenever there's a sermon or series id; no `screen` param.
  const screen: ScreenMode = params.id != null || params.seriesId != null ? 'detail' : 'browse';
  const from = config.from || params.from;
  const to = config.to || params.to;

  // An explicit choice (user click or ?view=) wins; otherwise the config default.
  const urlView: ViewMode | null = params.view === 'large' ? 'list' : params.view;
  const effectiveView: ViewMode = urlView ?? defaultView;

  // Parse comma-separated IDs for multi-select filters, with config overrides.
  // Config values may be numbers (from parseDataAttributes coercion) — coerce to string.
  const selectedSeriesIds = parseIds(
    (config.seriesId ? String(config.seriesId) : null) || params.series,
  );
  const selectedSpeakerIds = parseIds(
    (config.speakerId ? String(config.speakerId) : null) || params.speaker,
  );
  const selectedBookIds = parseIds((config.bookId ? String(config.bookId) : null) || params.book);
  const selectedServiceTypeIds = parseIds(
    (config.serviceTypeId ? String(config.serviceTypeId) : null) || params.serviceTypes,
  );
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
          id: null,
          seriesId: null,
          fromSeriesId: null,
          page: 1,
        });
      };

  /** Open a sermon (`detail`) or return to the list (`browse`). */
  const setScreen = (screen: ScreenMode, id?: number) => {
    void setParams({
      id: screen === 'detail' ? (id ?? null) : null,
      seriesId: null,
      fromSeriesId: null,
    });
  };

  /** Navigate from a series detail to a sermon detail, remembering the series */
  const setSermonFromSeries = (sermonId: number, seriesId: number) => {
    void setParams({
      tab: config.tab || 'series',
      id: sermonId,
      seriesId: null,
      fromSeriesId: seriesId,
    });
  };

  /** Navigate to a series detail view */
  const setSeriesDetail = (seriesId: number) => {
    void setParams({
      tab: config.tab || 'series',
      id: null,
      seriesId,
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

  const setServiceTypes: (ids: number[]) => void = config.serviceTypeId
    ? noop
    : (ids: number[]) => {
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

  // View is a layout preference, not a content filter: changing it doesn't
  // re-query or reset the page. `history: 'replace'` keeps it out of the back
  // stack (toggling grid/list shouldn't add history entries).
  const setView = (view: ViewMode) => {
    void setParams({ view }, { history: 'replace' });
  };

  const setPage = (page: number) => {
    void setParams({ page });
  };

  const clearedFilterParams = () => {
    // Locked dimensions are omitted entirely (a `null` would clear their
    // pinned value); only unlocked dimensions are reset to `null`.
    const next: Parameters<typeof setParams>[0] = {
      search: null,
      sort: 'date',
      order: 'desc',
      page: 1,
    };
    if (!config.seriesId) next.series = null;
    if (!config.serviceTypeId) next.serviceTypes = null;
    if (!config.speakerId) next.speaker = null;
    if (!config.bookId) next.book = null;
    if (!config.seriesTypeId) next.seriesType = null;
    if (!config.from) next.from = null;
    if (!config.to) next.to = null;
    return next;
  };

  const clearFilters = () => {
    void setParams(clearedFilterParams());
  };

  const collapsibleFilterActive = [
    !config.seriesId && selectedSeriesIds.length > 0,
    !config.speakerId && selectedSpeakerIds.length > 0,
    !config.bookId && selectedBookIds.length > 0,
    !config.serviceTypeId && selectedServiceTypeIds.length > 0,
    !config.seriesTypeId && selectedSeriesTypeIds.length > 0,
    (!config.from && params.from !== null) || (!config.to && params.to !== null),
  ];
  const activeFilterCount = collapsibleFilterActive.filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0 || !!params.search;

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

  // A series / speaker link (on a card or the sermon detail header) sets that
  // filter on the sermons list, so it only links when the filter bar shows
  // (display 'full'), the dimension isn't locked or hidden, and the embed
  // hasn't locked the widget to the series tab — otherwise the click would
  // apply a filter the viewer can't see or clear.
  const canShowOnly = (dimension: 'series' | 'speaker') =>
    (config.display ?? 'full') === 'full' &&
    !lockedFilters.has(dimension) &&
    (!config.tab || config.tab === 'sermons');

  // "Every sermon in this series" (or by this speaker): back to the sermons
  // list with the other filters reset and the one dimension pinned — in a
  // single URL update, so Back returns to where the viewer clicked.
  const showOnly = (dimension: 'series' | 'speaker', id: number) => {
    if (!canShowOnly(dimension)) return;
    void setParams({
      ...clearedFilterParams(),
      [dimension]: String(id),
      tab: 'sermons',
      id: null,
      seriesId: null,
      fromSeriesId: null,
    });
  };

  return {
    ...params,
    screen,
    view: effectiveView,
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
    setView,
    setPage,
    clearFilters,
    canShowOnly,
    showOnly,
    hasActiveFilters,
    activeFilterCount,
    lockedFilters,
  };
}
