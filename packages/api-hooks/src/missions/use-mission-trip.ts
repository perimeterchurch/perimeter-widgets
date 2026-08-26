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

export type UseMissionTripParticipantResponse =
  operations['getMissionTripParticipant']['responses']['200']['content']['application/json'];

/** One participant's letter, fundraising progress and social links. */
export type MissionTripParticipantDetail = UseMissionTripParticipantResponse['data'];

/**
 * One trip participant for the finder's GO Journey Participant view. Backs
 * `GET /api/mission-trips/{id}/participant/{pledgeId}`.
 *
 * `letter` is HTML authored in Ministry Platform's editor — sanitize it. The
 * endpoint 404s when the pledge does not hold a seat on `tripId`, which is the
 * membership check rather than an error to surface loudly.
 */
export function useMissionTripParticipant(
  tripId: number,
  pledgeId: number,
): UseQueryResult<UseMissionTripParticipantResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['mission-trip-participant', tripId, pledgeId],
    queryFn: async () =>
      fetchJson<UseMissionTripParticipantResponse>(
        client,
        `/api/mission-trips/${tripId}/participant/${pledgeId}`,
        'Mission trip participant',
      ),
    enabled: Number.isFinite(tripId) && tripId > 0 && Number.isFinite(pledgeId) && pledgeId > 0,
  });
}
