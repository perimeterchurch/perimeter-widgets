import { useEffect, useMemo } from 'react';
import {
  useBooks,
  useSeries,
  useSeriesTypes,
  useServiceTypes,
  useSpeakers,
} from '@perimeter/api-hooks';
import type { SermonsConfig } from '../types';
import { defined, idsParam } from '../lib/query-params';
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
 *
 * This is a widget-internal composite over multiple `@perimeter/api-hooks`
 * endpoints. Those hooks now take raw OpenAPI query params (e.g.
 * `seriesId: '1,2'`) and return the full `{ success, data, meta }` envelope,
 * so this hook (a) translates the widget's `selectedXIds: number[]` filter
 * state into comma-joined string params and (b) unwraps `result.data?.data`
 * to get the underlying arrays. `config.seriesTypeId` is forwarded as the
 * default series-type pin when present.
 */
export function useSermonFacets({ config, filters, labelCache }: UseSermonFacetsParams) {
  // Config-pinned series type (e.g. the "Sunday Morning Sermon" default)
  // applies to every facet query as a baseline narrowing.
  const pinnedSeriesTypeId = config.seriesTypeId || undefined;

  // --- Primer queries (unfiltered, aside from the config pin) ---
  const allSpeakersQuery = useSpeakers(defined({ seriesTypeId: pinnedSeriesTypeId }));
  const allBooksQuery = useBooks(defined({ seriesTypeId: pinnedSeriesTypeId }));
  const allServiceTypesQuery = useServiceTypes(defined({ seriesTypeId: pinnedSeriesTypeId }));
  const allSeriesTypesQuery = useSeriesTypes({});
  // Series filter dropdown sorts alphabetically (A→Z). The API sorts before
  // paginating, so `sort:'title'` makes the capped 50 the alphabetically-first
  // series in order — not a client-side sort of an arbitrary page.
  const allSeriesQuery = useSeries(
    defined({ perPage: 50, seriesTypeId: pinnedSeriesTypeId, sort: 'title', order: 'asc' }),
  );

  const allSpeakers = useMemo(() => allSpeakersQuery.data?.data ?? [], [allSpeakersQuery.data]);
  const allBooks = useMemo(() => allBooksQuery.data?.data ?? [], [allBooksQuery.data]);
  const allServiceTypes = useMemo(
    () => allServiceTypesQuery.data?.data ?? [],
    [allServiceTypesQuery.data],
  );
  const allSeriesTypes = useMemo(
    () => allSeriesTypesQuery.data?.data ?? [],
    [allSeriesTypesQuery.data],
  );
  const allSeriesItems = useMemo(
    () => allSeriesQuery.data?.data.series ?? [],
    [allSeriesQuery.data],
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

  // Filter values shared across the narrowed queries.
  const search = filters.search || undefined;
  const from = filters.from ?? undefined;
  const to = filters.to ?? undefined;
  const seriesTypeId = idsParam(filters.selectedSeriesTypeIds) ?? pinnedSeriesTypeId;

  // --- Narrowed queries (apply every other filter dimension) ---
  const speakersQuery = useSpeakers(
    defined({
      search,
      seriesId: idsParam(filters.selectedSeriesIds),
      bookId: idsParam(filters.selectedBookIds),
      serviceTypeId: idsParam(filters.selectedServiceTypeIds),
      seriesTypeId,
      from,
      to,
    }),
  );
  const booksQuery = useBooks(
    defined({
      search,
      seriesId: idsParam(filters.selectedSeriesIds),
      speakerId: idsParam(filters.selectedSpeakerIds),
      serviceTypeId: idsParam(filters.selectedServiceTypeIds),
      seriesTypeId,
      from,
      to,
    }),
  );
  const serviceTypesQuery = useServiceTypes(
    defined({
      search,
      seriesId: idsParam(filters.selectedSeriesIds),
      speakerId: idsParam(filters.selectedSpeakerIds),
      bookId: idsParam(filters.selectedBookIds),
      seriesTypeId,
      from,
      to,
    }),
  );
  const seriesTypesQuery = useSeriesTypes(
    defined({
      search,
      seriesId: idsParam(filters.selectedSeriesIds),
      speakerId: idsParam(filters.selectedSpeakerIds),
      bookId: idsParam(filters.selectedBookIds),
      serviceTypeId: idsParam(filters.selectedServiceTypeIds),
      from,
      to,
    }),
  );
  const seriesQuery = useSeries(
    defined({
      perPage: 50,
      search,
      speakerId: idsParam(filters.selectedSpeakerIds),
      bookId: idsParam(filters.selectedBookIds),
      serviceTypeId: idsParam(filters.selectedServiceTypeIds),
      seriesTypeId,
      from,
      to,
    }),
  );

  const speakers = useMemo(() => speakersQuery.data?.data ?? [], [speakersQuery.data]);
  const books = useMemo(() => booksQuery.data?.data ?? [], [booksQuery.data]);
  const serviceTypes = useMemo(() => serviceTypesQuery.data?.data ?? [], [serviceTypesQuery.data]);
  const seriesTypes = useMemo(() => seriesTypesQuery.data?.data ?? [], [seriesTypesQuery.data]);
  const series = useMemo(() => seriesQuery.data?.data.series ?? [], [seriesQuery.data]);

  // Also absorb the *narrowed* facet results. A pinned/deep-linked filter
  // (e.g. a series beyond the 50-item primer page, or a speaker the
  // series-type pin filtered out of the primer) is otherwise never seen by
  // the primer fetches, so its chip would fall back to the generic
  // "Series <id>"/"Speaker <id>" label. The narrowed queries surface the
  // selected entity's real label while it still satisfies the other
  // dimensions; absorbing it here makes that label stick in the cache even
  // after later re-narrowing drops it from the visible list.
  useEffect(() => {
    labelCache.absorb(
      'speaker',
      speakers.map((s) => ({ id: s.id, label: s.name })),
    );
  }, [speakers, labelCache]);
  useEffect(() => {
    labelCache.absorb(
      'book',
      books.map((b) => ({ id: b.id, label: b.name })),
    );
  }, [books, labelCache]);
  useEffect(() => {
    labelCache.absorb(
      'series',
      series.map((s) => ({ id: s.id, label: s.displayTitle ?? s.title })),
    );
  }, [series, labelCache]);
  useEffect(() => {
    labelCache.absorb(
      'serviceType',
      serviceTypes.map((s) => ({ id: s.id, label: s.name })),
    );
  }, [serviceTypes, labelCache]);
  useEffect(() => {
    labelCache.absorb(
      'seriesType',
      seriesTypes.map((s) => ({ id: s.id, label: s.name })),
    );
  }, [seriesTypes, labelCache]);

  return {
    speakers,
    books,
    serviceTypes,
    seriesTypes,
    series,
    speakersLoading: speakersQuery.isLoading,
    booksLoading: booksQuery.isLoading,
    serviceTypesLoading: serviceTypesQuery.isLoading,
    seriesTypesLoading: seriesTypesQuery.isLoading,
    seriesLoading: seriesQuery.isLoading,
  };
}
