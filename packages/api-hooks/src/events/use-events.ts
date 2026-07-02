import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { serializeQuery } from '../internal/serialize-query';
import { fetchJson } from '../internal/fetch-json';

export type UseEventsParams = NonNullable<operations['listEvents']['parameters']['query']>;
export type UseEventsResponse =
  operations['listEvents']['responses']['200']['content']['application/json'];

/** A single event as returned by the event-finder list endpoint. */
export type EventListItem = UseEventsResponse['data']['events'][number];

/**
 * List events for the event-finder widget, filtered by MP Events List
 * (`listId`, comma-separated). Upcoming-only by default; pass
 * `includePast: 'true'` for past events. Backs `GET /api/events`.
 */
export function useEvents(
  params: UseEventsParams,
  options?: { enabled?: boolean },
): UseQueryResult<UseEventsResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['events', params],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const search = serializeQuery(params);
      return fetchJson<UseEventsResponse>(
        client,
        `/api/events${search ? `?${search}` : ''}`,
        'Events',
      );
    },
  });
}
