import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { serializeQuery } from '../internal/serialize-query';
import { fetchJson } from '../internal/fetch-json';

export type UseMissionTripsParams = NonNullable<
  operations['listMissionTrips']['parameters']['query']
>;
export type UseMissionTripsResponse =
  operations['listMissionTrips']['responses']['200']['content']['application/json'];

/** A single GO Journey as returned by the mission-trip list endpoint. */
export type MissionTrip = UseMissionTripsResponse['data']['trips'][number];

/**
 * List GO Journey mission trips for the mission-trip-finder widget. Open,
 * website-visible campaigns only by default; pass `includePast: 'true'` for
 * closed ones and `includeFull: 'false'` to hide trips at capacity. Backs
 * `GET /api/mission-trips`.
 */
export function useMissionTrips(
  params?: UseMissionTripsParams,
  options?: { enabled?: boolean },
): UseQueryResult<UseMissionTripsResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['mission-trips', params],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const search = serializeQuery(params ?? {});
      return fetchJson<UseMissionTripsResponse>(
        client,
        `/api/mission-trips${search ? `?${search}` : ''}`,
        'Mission trips',
      );
    },
  });
}
