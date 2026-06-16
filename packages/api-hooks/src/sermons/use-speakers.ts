import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { serializeQuery } from '../internal/serialize-query';
import { fetchJson } from '../internal/fetch-json';
import { FACET_STALE_TIME } from '../internal/stale-time';

export type UseSpeakersParams = NonNullable<operations['listSpeakers']['parameters']['query']>;
export type UseSpeakersResponse =
  operations['listSpeakers']['responses']['200']['content']['application/json'];

export function useSpeakers(params: UseSpeakersParams = {}): UseQueryResult<UseSpeakersResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['speakers', params],
    queryFn: async () => {
      const search = serializeQuery(params);
      return fetchJson<UseSpeakersResponse>(
        client,
        `/api/sermons/speakers${search ? `?${search}` : ''}`,
        'Speakers',
      );
    },
    staleTime: FACET_STALE_TIME,
  });
}
