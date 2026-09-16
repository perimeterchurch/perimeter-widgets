import type { operations } from '../generated/operations';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { fetchJson } from '../internal/fetch-json';

/** The plan body shared by quote and submit. */
export type RegistrationPlanInput =
  operations['quoteRegistration']['requestBody']['content']['application/json'];
export type RegistrationPlanEntry = RegistrationPlanInput['registrations'][number];
export type RegistrationAttendee = RegistrationPlanEntry['attendee'];
export type RegistrationPurchaser = RegistrationPlanInput['purchaser'];

export type QuoteRegistrationResponse =
  operations['quoteRegistration']['responses']['200']['content']['application/json'];
export type RegistrationQuote = QuoteRegistrationResponse['data'];
export type QuoteProblem = RegistrationQuote['problems'][number];
export type QuotedRegistration = RegistrationQuote['registrations'][number];

/**
 * Price a draft plan — `POST /api/registration/events/{id}/quote`. A mutation
 * rather than a query because the body is the whole draft and the call must
 * never be retried or cached by React Query; it writes nothing server-side.
 * Returns every problem at once so the review screen can list them.
 */
export function useRegistrationQuote(
  eventId: number | null,
): UseMutationResult<QuoteRegistrationResponse, Error, RegistrationPlanInput> {
  const client = useApiClient();
  return useMutation({
    mutationFn: (plan: RegistrationPlanInput) => {
      if (eventId === null) return Promise.reject(new Error('No event to quote'));
      return fetchJson<QuoteRegistrationResponse>(
        client,
        `/api/registration/events/${eventId}/quote`,
        'Registration quote',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(plan),
        },
      );
    },
  });
}
