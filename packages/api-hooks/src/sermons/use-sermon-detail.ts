import type { operations } from '@perimeter/api-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';

export type UseSermonDetailResponse =
  operations['getSermon']['responses']['200']['content']['application/json'];

export function useSermonDetail(id: number): UseQueryResult<UseSermonDetailResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['sermon', id],
    queryFn: async () => {
      const res = await client.fetch(`/api/sermons/sermon/${id}`);
      if (!res.ok) throw new Error(`Sermon detail request failed: ${res.status}`);
      return (await res.json()) as UseSermonDetailResponse;
    },
    enabled: Number.isFinite(id) && id > 0,
  });
}
