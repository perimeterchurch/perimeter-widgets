import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { fetchJson } from '../internal/fetch-json';

export type UseSermonDetailResponse =
  operations['getSermon']['responses']['200']['content']['application/json'];

export function useSermonDetail(id: number): UseQueryResult<UseSermonDetailResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['sermon', id],
    queryFn: async () =>
      fetchJson<UseSermonDetailResponse>(client, `/api/sermons/sermon/${id}`, 'Sermon detail'),
    enabled: Number.isFinite(id) && id > 0,
  });
}
