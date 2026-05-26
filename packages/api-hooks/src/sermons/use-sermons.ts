import type { operations } from '@perimeter/api-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { serializeQuery } from '../internal/serialize-query';

export type UseSermonsParams = NonNullable<operations['listSermons']['parameters']['query']>;
export type UseSermonsResponse =
  operations['listSermons']['responses']['200']['content']['application/json'];

export function useSermons(params: UseSermonsParams): UseQueryResult<UseSermonsResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['sermons', params],
    queryFn: async () => {
      const search = serializeQuery(params);
      const res = await client.fetch(`/api/sermons${search ? `?${search}` : ''}`);
      if (!res.ok) throw new Error(`Sermons request failed: ${res.status}`);
      return (await res.json()) as UseSermonsResponse;
    },
  });
}
