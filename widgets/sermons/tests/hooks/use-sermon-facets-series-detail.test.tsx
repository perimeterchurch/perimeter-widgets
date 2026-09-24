/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSermonFacets } from '../../src/hooks/use-sermon-facets';
import { useFilterLabelCache, type FilterLabelCache } from '../../src/hooks/use-filter-label-cache';
import type { useSermonFilters } from '../../src/hooks/use-sermon-filters';
import type { SermonsConfig } from '../../src/types';

/**
 * Regression for a selected series reading "Series 1360" after a reload or a
 * shared link: both series facet queries are capped at the alphabetically-first
 * 50, and the list endpoint can't filter by id, so a series like "Titus: …"
 * never gets a label from them. The hook fetches just those ids by detail.
 */
function queryResult(envelope: unknown) {
  return { data: envelope, isLoading: false, isPending: false, isSuccess: true, error: null };
}

const LISTED = { id: 5, title: 'Acts', displayTitle: null };
const useSeriesDetails = vi.fn((ids: number[]) =>
  ids.map((id) => ({
    data: { success: true, data: { id, title: 'Titus', displayTitle: 'Titus: A Healthy Church' } },
  })),
);

vi.mock('@perimeter/api-hooks', () => ({
  useSpeakers: () => queryResult({ success: true, data: [] }),
  useBooks: () => queryResult({ success: true, data: [] }),
  useServiceTypes: () => queryResult({ success: true, data: [] }),
  useSeriesTypes: () => queryResult({ success: true, data: [] }),
  useSeriesDetails: (ids: number[]) => useSeriesDetails(ids),
  useSeries: () =>
    queryResult({
      success: true,
      data: { series: [LISTED], pagination: { page: 1, perPage: 50, total: 1, totalPages: 1 } },
    }),
}));

const testConfig: SermonsConfig = {
  perPage: 12,
  defaultTab: 'sermons',
  defaultView: 'grid',
  display: 'full',
};

function filtersWithSeries(ids: number[]) {
  return {
    search: '',
    selectedSeriesIds: ids,
    selectedSpeakerIds: [],
    selectedBookIds: [],
    selectedServiceTypeIds: [],
    selectedSeriesTypeIds: [],
    from: null,
    to: null,
  } as unknown as ReturnType<typeof useSermonFilters>;
}

beforeEach(() => {
  useSeriesDetails.mockClear();
});

describe('useSermonFacets unlisted series labels', () => {
  it('fetches a selected series missing from both capped pages and caches its label', async () => {
    let cache!: FilterLabelCache;
    renderHook(() =>
      useSermonFacets({
        config: testConfig,
        filters: filtersWithSeries([1360]),
        labelCache: (cache = useFilterLabelCache()),
      }),
    );

    await waitFor(() => expect(cache.getLabel('series', 1360)).toBe('Titus: A Healthy Church'));
    expect(useSeriesDetails).toHaveBeenCalledWith([1360]);
    // Once cached, the next render asks for nothing more.
    expect(useSeriesDetails).toHaveBeenLastCalledWith([]);
  });

  it('does not fetch a selected series the capped page already lists', () => {
    renderHook(() =>
      useSermonFacets({
        config: testConfig,
        filters: filtersWithSeries([LISTED.id]),
        labelCache: useFilterLabelCache(),
      }),
    );

    expect(useSeriesDetails).not.toHaveBeenCalledWith([LISTED.id]);
  });
});
