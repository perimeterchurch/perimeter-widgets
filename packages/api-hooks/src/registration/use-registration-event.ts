import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { serializeQuery } from '../internal/serialize-query';
import { fetchJson } from '../internal/fetch-json';

export type UseRegistrationEventResponse =
  operations['getRegistrationEvent']['responses']['200']['content']['application/json'];

/** The event with its registration sections, as the widget renders it. */
export type RegistrationEvent = UseRegistrationEventResponse['data'];
export type RegistrationSection = RegistrationEvent['sections'][number];
export type RegistrationProduct = NonNullable<RegistrationSection['product']>;
export type RegistrationOptionGroup = RegistrationProduct['groups'][number];
export type RegistrationOptionPrice = RegistrationOptionGroup['prices'][number];
export type RegistrationForm = NonNullable<RegistrationSection['form']>;
export type RegistrationFormField = RegistrationForm['fields'][number];

export const REGISTRATION_EVENT_QUERY_KEY = 'registration-event';

/**
 * Event details plus every registration section (the parent when it has a
 * product, then each `bp_Related_Events` row) with products, option
 * availability, form fields and the viewer's state. Backs
 * `GET /api/registration/events/{id}`.
 *
 * `pageUrl` is the embedding page: an `External_Registration_URL` that points
 * back at it is not reported as external, so the page can host itself.
 *
 * Re-keyed on `signedIn` so a sign-in mid-visit refetches with the token
 * (staff-only visibility, viewer contact) rather than serving the anonymous
 * answer from cache.
 */
export function useRegistrationEvent(
  eventId: number | null,
  params: { pageUrl: string | null; signedIn: boolean },
  options?: { enabled?: boolean },
): UseQueryResult<UseRegistrationEventResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: [REGISTRATION_EVENT_QUERY_KEY, eventId, params.signedIn, params.pageUrl],
    enabled: (options?.enabled ?? true) && eventId !== null,
    // Availability moves; the server caches for 60s, and the submit re-reads.
    staleTime: 30_000,
    queryFn: async () => {
      const search = serializeQuery({ page: params.pageUrl ?? undefined });
      return fetchJson<UseRegistrationEventResponse>(
        client,
        `/api/registration/events/${eventId}${search ? `?${search}` : ''}`,
        'Event registration',
      );
    },
  });
}
