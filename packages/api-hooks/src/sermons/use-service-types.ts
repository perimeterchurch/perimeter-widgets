import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { serializeQuery } from '../internal/serialize-query';
import { fetchJson } from '../internal/fetch-json';
import { FACET_STALE_TIME } from '../internal/stale-time';

export type UseServiceTypesParams = NonNullable<
  operations['listServiceTypes']['parameters']['query']
>;
export type UseServiceTypesResponse =
  operations['listServiceTypes']['responses']['200']['content']['application/json'];

export function useServiceTypes(
  params: UseServiceTypesParams = {},
): UseQueryResult<UseServiceTypesResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['service-types', params],
    queryFn: async () => {
      const search = serializeQuery(params);
      return fetchJson<UseServiceTypesResponse>(
        client,
        `/api/sermons/service-types${search ? `?${search}` : ''}`,
        'Service types',
      );
    },
    staleTime: FACET_STALE_TIME,
  });
}
