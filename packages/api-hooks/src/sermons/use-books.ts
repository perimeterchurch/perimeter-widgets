import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { serializeQuery } from '../internal/serialize-query';
import { fetchJson } from '../internal/fetch-json';
import { FACET_STALE_TIME } from '../internal/stale-time';

export type UseBooksParams = NonNullable<operations['listBooks']['parameters']['query']>;
export type UseBooksResponse =
  operations['listBooks']['responses']['200']['content']['application/json'];

export function useBooks(params: UseBooksParams = {}): UseQueryResult<UseBooksResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['books', params],
    queryFn: async () => {
      const search = serializeQuery(params);
      return fetchJson<UseBooksResponse>(
        client,
        `/api/sermons/books${search ? `?${search}` : ''}`,
        'Books',
      );
    },
    staleTime: FACET_STALE_TIME,
  });
}
