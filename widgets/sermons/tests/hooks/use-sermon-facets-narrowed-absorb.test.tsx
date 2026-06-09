/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSermonFacets } from '../../src/hooks/use-sermon-facets';
import { useFilterLabelCache, type FilterLabelCache } from '../../src/hooks/use-filter-label-cache';
import type { useSermonFilters } from '../../src/hooks/use-sermon-filters';
import type { SermonsConfig } from '../../src/types';

/**
 * Regression for the pinned/deep-linked chip falling back to the generic
 * "Speaker <id>" label. The primer fetch is narrowed by the config series-type
 * pin (and the series primer is capped at 50), so a deep-linked selection can
 * be absent from the primer response yet still surface in its dimension's
 * *narrowed* query. Absorbing the narrowed results seeds the label cache so the
 * chip renders the real label, not the fallback.
 *
 * The mock returns the selected speaker ONLY for the narrowed call (params that
 * carry a sibling filter dimension) and an empty list for the primer call, so a
 * cache hit can only come from absorbing the narrowed response.
 */
function queryResult(envelope: unknown) {
  return { data: envelope, isLoading: false, isError: false, isSuccess: true, error: null };
}

const NARROWED_SPEAKER = { id: 99, name: 'Deep Linked Speaker', bio: null };

vi.mock('@perimeter/api-hooks', () => ({
  useSpeakers: (params: { bookId?: string } = {}) => {
    // Narrowed query carries the sibling bookId dimension; primer does not.
    const isNarrowed = params.bookId !== undefined;
    return queryResult({ success: true, data: isNarrowed ? [NARROWED_SPEAKER] : [] });
  },
  useBooks: () => queryResult({ success: true, data: [] }),
  useServiceTypes: () => queryResult({ success: true, data: [] }),
  useSeriesTypes: () => queryResult({ success: true, data: [] }),
  useSeries: () =>
    queryResult({
      success: true,
      data: { series: [], pagination: { page: 1, perPage: 50, total: 0, totalPages: 0 } },
    }),
}));

const testConfig: SermonsConfig = {
  perPage: 12,
  defaultTab: 'sermons',
  defaultView: 'grid',
  display: 'full',
};

const baseFilters = {
  search: '',
  selectedSeriesIds: [],
  selectedSpeakerIds: [],
  selectedBookIds: [],
  selectedServiceTypeIds: [],
  selectedSeriesTypeIds: [],
  from: null,
  to: null,
} as unknown as ReturnType<typeof useSermonFilters>;

describe('useSermonFacets narrowed-result absorption', () => {
  it('seeds the label cache from a narrowed facet result absent from the primer', async () => {
    let cache!: FilterLabelCache;
    const { result } = renderHook(() =>
      useSermonFacets({
        config: testConfig,
        // A sibling filter (bookId) is active, so the narrowed speakers query
        // carries it and returns the deep-linked speaker the primer omitted.
        filters: { ...baseFilters, selectedBookIds: [10] },
        labelCache: (cache = useFilterLabelCache()),
      }),
    );

    await waitFor(() => expect(result.current.speakers).toHaveLength(1));

    // Primer returned []; the only path to a cached label is the narrowed
    // response, proving the deep-link seeding fix is in place.
    expect(cache.getLabel('speaker', 99)).toBe('Deep Linked Speaker');
  });
});
