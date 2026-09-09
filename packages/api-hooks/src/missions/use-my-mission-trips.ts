import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { fetchJson } from '../internal/fetch-json';

export type UseMyMissionTripsResponse =
  operations['getMyMissionTrips']['responses']['200']['content']['application/json'];

/**
 * One mission-trip pledge belonging to the signed-in member or — when they are
 * a head of their household — to a household member.
 *
 * The grain is a **pledge, not a campaign**: two household members on the same
 * trip are two rows sharing a `campaignId`, which is what `mine` and
 * `participantName` are for.
 */
export type MyMissionTrip = UseMyMissionTripsResponse['data']['trips'][number];

/** One gift toward a participant's pledge. Anonymous gifts carry no identity. */
export type MyMissionDonation = MyMissionTrip['donations'][number];

/** A fellow participant on a trip the viewer leads. */
export type MyMissionParticipant = MyMissionTrip['participants'][number];

/**
 * A trip leader. Carries `pledgeId` rather than a photo URL — compose the
 * photo URL from it with `leaderPhotoUrl()` in the widget.
 */
export type MyMissionLeader = MyMissionTrip['leaders'][number];

/** Whole-trip funding totals; `null` unless the viewer leads the trip. */
export type MyMissionLeaderSummary = NonNullable<MyMissionTrip['leaderSummary']>;

/** A donor's mailing address on a donation row. */
export type MyMissionAddress = NonNullable<MyMissionDonation['address']>;

/**
 * The signed-in user's mission trips — their own pledges plus, when they are a
 * head of household, their household members'.
 *
 * Authenticated with no params: the bearer token is attached by the api-client
 * from the widget's auth provider and the endpoint derives the donor and
 * household entirely from it, so a user can never read another household's
 * trips. Left at the QueryClient default stale time — donation totals move
 * during a campaign, so this is content, not a facet list.
 */
export function useMyMissionTrips(options?: {
  enabled?: boolean;
}): UseQueryResult<UseMyMissionTripsResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['my-mission-trips'],
    enabled: options?.enabled ?? true,
    queryFn: () =>
      fetchJson<UseMyMissionTripsResponse>(client, '/api/missions/my-trips', 'My mission trips'),
  });
}
