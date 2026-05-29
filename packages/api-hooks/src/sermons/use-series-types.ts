import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { serializeQuery } from '../internal/serialize-query';
import { fetchJson } from '../internal/fetch-json';

export type UseSeriesTypesParams = NonNullable<
  operations['listSeriesTypes']['parameters']['query']
>;
export type UseSeriesTypesResponse =
  operations['listSeriesTypes']['responses']['200']['content']['application/json'];

export function useSeriesTypes(
  params: UseSeriesTypesParams = {},
): UseQueryResult<UseSeriesTypesResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['series-types', params],
    queryFn: async () => {
      const search = serializeQuery(params);
      return fetchJson<UseSeriesTypesResponse>(
        client,
        `/api/sermons/series-types${search ? `?${search}` : ''}`,
        'Series types',
      );
    },
  });
}
