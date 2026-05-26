import type { operations } from '@perimeter/api-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { serializeQuery } from '../internal/serialize-query';

export type UseSeriesParams = NonNullable<operations['listSeries']['parameters']['query']>;
export type UseSeriesResponse =
  operations['listSeries']['responses']['200']['content']['application/json'];

export function useSeries(params: UseSeriesParams): UseQueryResult<UseSeriesResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['series', params],
    queryFn: async () => {
      const search = serializeQuery(params);
      const res = await client.fetch(`/api/sermons/series${search ? `?${search}` : ''}`);
      if (!res.ok) throw new Error(`Series request failed: ${res.status}`);
      return (await res.json()) as UseSeriesResponse;
    },
  });
}
