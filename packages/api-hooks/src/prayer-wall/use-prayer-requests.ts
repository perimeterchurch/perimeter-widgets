import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { serializeQuery } from '../internal/serialize-query';
import { fetchJson } from '../internal/fetch-json';

export type UsePrayerRequestsParams = NonNullable<
  operations['listPrayerRequests']['parameters']['query']
>;
export type UsePrayerRequestsResponse =
  operations['listPrayerRequests']['responses']['200']['content']['application/json'];

/** One request on the wall. Carries a first name only, or 'Anonymous'. */
export type PrayerRequest = UsePrayerRequestsResponse['data']['requests'][number];

/** Page label for the query key, so a paged wall caches per page. */
export const PRAYER_REQUESTS_QUERY_KEY = 'prayer-requests';

/**
 * One page of the prayer wall: staff-approved requests whose submitter chose to
 * share them online, newest first, inside a rolling window (`days`, default 60
 * server-side). Backs `GET /api/prayer-wall/requests`.
 */
export function usePrayerRequests(
  params?: UsePrayerRequestsParams,
  options?: { enabled?: boolean },
): UseQueryResult<UsePrayerRequestsResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: [PRAYER_REQUESTS_QUERY_KEY, params],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const search = serializeQuery(params ?? {});
      return fetchJson<UsePrayerRequestsResponse>(
        client,
        `/api/prayer-wall/requests${search ? `?${search}` : ''}`,
        'Prayer requests',
      );
    },
  });
}
