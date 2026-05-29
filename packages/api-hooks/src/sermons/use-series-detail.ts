import type { operations } from '@perimeter/api-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { fetchJson } from '../internal/fetch-json';

export type UseSeriesDetailResponse =
  operations['getSeriesDetail']['responses']['200']['content']['application/json'];

export function useSeriesDetail(id: number): UseQueryResult<UseSeriesDetailResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['series-detail', id],
    queryFn: async () =>
      fetchJson<UseSeriesDetailResponse>(client, `/api/sermons/series/${id}`, 'Series detail'),
    enabled: Number.isFinite(id) && id > 0,
  });
}
