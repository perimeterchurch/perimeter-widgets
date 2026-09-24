import type { operations } from '../generated/operations';
import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { fetchJson, type FetchClient } from '../internal/fetch-json';

export type UseSeriesDetailResponse =
  operations['getSeriesDetail']['responses']['200']['content']['application/json'];

function seriesDetailQuery(client: FetchClient, id: number) {
  return {
    queryKey: ['series-detail', id],
    queryFn: async () =>
      fetchJson<UseSeriesDetailResponse>(client, `/api/sermons/series/${id}`, 'Series detail'),
    enabled: Number.isFinite(id) && id > 0,
  };
}

export function useSeriesDetail(id: number): UseQueryResult<UseSeriesDetailResponse> {
  const client = useApiClient();
  return useQuery(seriesDetailQuery(client, id));
}

/**
 * {@link useSeriesDetail} for a variable set of ids, one query each. Shares
 * its cache key, so a series fetched here is already loaded when its detail
 * view opens (and vice versa).
 */
export function useSeriesDetails(ids: number[]): UseQueryResult<UseSeriesDetailResponse>[] {
  const client = useApiClient();
  return useQueries({ queries: ids.map((id) => seriesDetailQuery(client, id)) });
}
