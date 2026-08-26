import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { fetchJson } from '../internal/fetch-json';

export type UseMissionTripResponse =
  operations['getMissionTrip']['responses']['200']['content']['application/json'];

/** One GO Journey with its long-form body and team roster. */
export type MissionTripDetail = UseMissionTripResponse['data'];

/** One person on a trip's team. */
export type MissionTripParticipant = MissionTripDetail['participants'][number];

/**
 * One GO Journey mission trip for the finder's detail view. Backs
 * `GET /api/mission-trips/{id}`.
 *
 * Returns the same shape the list does, plus `longDescription` — HTML authored
 * in Ministry Platform's editor, so render it through a sanitizer, not
 * `dangerouslySetInnerHTML` — and `participants`.
 */
export function useMissionTrip(id: number): UseQueryResult<UseMissionTripResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['mission-trip', id],
    queryFn: async () =>
      fetchJson<UseMissionTripResponse>(client, `/api/mission-trips/${id}`, 'Mission trip'),
    enabled: Number.isFinite(id) && id > 0,
  });
}
