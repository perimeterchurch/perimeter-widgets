import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { serializeQuery } from '../internal/serialize-query';
import { fetchJson } from '../internal/fetch-json';

export type UseSermonsParams = NonNullable<operations['listSermons']['parameters']['query']>;
export type UseSermonsResponse =
  operations['listSermons']['responses']['200']['content']['application/json'];

export function useSermons(params: UseSermonsParams): UseQueryResult<UseSermonsResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['sermons', params],
    queryFn: async () => {
      const search = serializeQuery(params);
      return fetchJson<UseSermonsResponse>(
        client,
        `/api/sermons${search ? `?${search}` : ''}`,
        'Sermons',
      );
    },
  });
}
