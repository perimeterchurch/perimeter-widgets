import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { fetchJson } from '../internal/fetch-json';

export type UseRegistrationRosterResponse =
  operations['getRegistrationRoster']['responses']['200']['content']['application/json'];

export type RegistrationRoster = UseRegistrationRosterResponse['data'];
export type RosterMember = RegistrationRoster['members'][number];
export type RosterEligibility = RosterMember['eligibility'][number];

export const REGISTRATION_ROSTER_QUERY_KEY = 'registration-roster';

/**
 * The signed-in viewer's primary household with per-section eligibility for
 * one event. Backs `GET /api/registration/events/{id}/roster`, which requires
 * the MP bearer token — pass `enabled: false` while signed out, or every
 * anonymous page view 401s.
 */
export function useRegistrationRoster(
  eventId: number | null,
  options?: { enabled?: boolean },
): UseQueryResult<UseRegistrationRosterResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: [REGISTRATION_ROSTER_QUERY_KEY, eventId],
    enabled: (options?.enabled ?? true) && eventId !== null,
    // Duplicate flags must be current: never serve a roster from cache across
    // a submit.
    staleTime: 0,
    retry: false,
    queryFn: () =>
      fetchJson<UseRegistrationRosterResponse>(
        client,
        `/api/registration/events/${eventId}/roster`,
        'Household roster',
      ),
  });
}
