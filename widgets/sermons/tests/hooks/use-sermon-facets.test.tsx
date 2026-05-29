/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSermonFacets } from '../../src/hooks/use-sermon-facets';
import { useFilterLabelCache, type FilterLabelCache } from '../../src/hooks/use-filter-label-cache';
import type { useSermonFilters } from '../../src/hooks/use-sermon-filters';
import type { SermonsConfig } from '../../src/types';

const speakers = [
  { id: 1, name: 'Alice Smith', bio: null },
  { id: 2, name: 'Bob Jones', bio: null },
];
const books = [
  { id: 10, name: 'Genesis' },
  { id: 11, name: 'Exodus' },
];
const serviceTypes = [{ id: 20, name: 'Sunday Morning' }];
const seriesTypes = [{ id: 30, name: 'Sermon Series' }];
const series = [{ id: 100, title: 'Genesis Walk', displayTitle: 'Genesis Walk' }];

// Record the params each upstream hook was called with so we can assert that
// the composite forwards the current filter state into the narrowed queries.
const speakersCalls: unknown[] = [];
const booksCalls: unknown[] = [];
const serviceTypesCalls: unknown[] = [];
const seriesTypesCalls: unknown[] = [];
const seriesCalls: unknown[] = [];

/** Build a minimal UseQueryResult-shaped object wrapping the API envelope. */
function queryResult(envelope: unknown) {
  return {
    data: envelope,
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
  };
}

vi.mock('@perimeter/api-hooks', () => ({
  useSpeakers: (params: unknown) => {
    speakersCalls.push(params);
    return queryResult({ success: true, data: speakers });
  },
  useBooks: (params: unknown) => {
    booksCalls.push(params);
    return queryResult({ success: true, data: books });
  },
  useServiceTypes: (params: unknown) => {
    serviceTypesCalls.push(params);
    return queryResult({ success: true, data: serviceTypes });
  },
  useSeriesTypes: (params: unknown) => {
    seriesTypesCalls.push(params);
    return queryResult({ success: true, data: seriesTypes });
  },
  useSeries: (params: unknown) => {
    seriesCalls.push(params);
    return queryResult({
      success: true,
      data: {
        series,
        pagination: { page: 1, perPage: 50, total: 1, totalPages: 1 },
      },
    });
  },
}));

const testConfig: SermonsConfig = {
  perPage: 12,
  defaultTab: 'sermons',
  defaultView: 'grid',
  display: 'full',
};

const emptyFilters = {
  search: '',
  selectedSeriesIds: [],
  selectedSpeakerIds: [],
  selectedBookIds: [],
  selectedServiceTypeIds: [],
  selectedSeriesTypeIds: [],
  from: null,
  to: null,
} as unknown as ReturnType<typeof useSermonFilters>;

function renderFacets(overrides: Partial<ReturnType<typeof useSermonFilters>> = {}) {
  let cache!: FilterLabelCache;
  const result = renderHook(() => {
    cache = useFilterLabelCache();
    return useSermonFacets({
      config: testConfig,
      filters: { ...emptyFilters, ...overrides },
      labelCache: cache,
    });
  });
  return { ...result, getCache: () => cache };
}

beforeEach(() => {
  speakersCalls.length = 0;
  booksCalls.length = 0;
  serviceTypesCalls.length = 0;
  seriesTypesCalls.length = 0;
  seriesCalls.length = 0;
});

describe('useSermonFacets', () => {
  it('returns the narrowed facet lists from the upstream hooks', () => {
    const { result } = renderFacets();

    expect(result.current.speakers).toHaveLength(2);
    expect(result.current.books).toHaveLength(2);
    expect(result.current.serviceTypes).toHaveLength(1);
    expect(result.current.seriesTypes).toHaveLength(1);
    expect(result.current.series).toHaveLength(1);
  });

  it('absorbs primer results into the label cache so dropped chips can rehydrate', async () => {
    const { result, getCache } = renderFacets();

    await waitFor(() => expect(result.current.speakers).toHaveLength(2));

    const cache = getCache();
    expect(cache.getLabel('speaker', 1)).toBe('Alice Smith');
    expect(cache.getLabel('book', 10)).toBe('Genesis');
    expect(cache.getLabel('series', 100)).toBe('Genesis Walk');
    expect(cache.getLabel('serviceType', 20)).toBe('Sunday Morning');
    expect(cache.getLabel('seriesType', 30)).toBe('Sermon Series');
  });

  it('translates selected IDs into comma-joined params on the narrowed query', () => {
    renderFacets({
      selectedBookIds: [10],
      selectedSeriesIds: [100, 101],
    });

    // Two calls per hook: primer (no narrowing) + narrowed. The narrowed
    // speakers call carries the bookId + seriesId filter dimensions.
    const narrowed = speakersCalls.find((p) => (p as { bookId?: string }).bookId !== undefined) as
      | { bookId?: string; seriesId?: string }
      | undefined;
    expect(narrowed).toBeDefined();
    expect(narrowed?.bookId).toBe('10');
    expect(narrowed?.seriesId).toBe('100,101');
  });

  it('does not narrow the primer speaker query by sibling filters', () => {
    renderFacets({ selectedBookIds: [10] });

    const primer = speakersCalls.find((p) => (p as { bookId?: string }).bookId === undefined);
    expect(primer).toBeDefined();
  });
});
