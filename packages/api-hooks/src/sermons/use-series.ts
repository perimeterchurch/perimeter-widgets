import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { serializeQuery } from '../internal/serialize-query';
import { fetchJson } from '../internal/fetch-json';

export type UseSeriesParams = NonNullable<operations['listSeries']['parameters']['query']>;
export type UseSeriesResponse =
  operations['listSeries']['responses']['200']['content']['application/json'];

export function useSeries(params: UseSeriesParams): UseQueryResult<UseSeriesResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['series', params],
    queryFn: async () => {
      const search = serializeQuery(params);
      return fetchJson<UseSeriesResponse>(
        client,
        `/api/sermons/series${search ? `?${search}` : ''}`,
        'Series',
      );
    },
  });
}
