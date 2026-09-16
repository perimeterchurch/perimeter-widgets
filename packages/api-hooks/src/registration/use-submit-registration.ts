import type { operations } from '../generated/operations';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { fetchJson } from '../internal/fetch-json';
import { REGISTRATION_EVENT_QUERY_KEY } from './use-registration-event';
import { REGISTRATION_ROSTER_QUERY_KEY } from './use-registration-roster';

export type SubmitRegistrationBody =
  operations['submitRegistration']['requestBody']['content']['application/json'];

export type SubmitRegistrationResponse =
  operations['submitRegistration']['responses']['201']['content']['application/json'];

export type RegistrationSubmitResult = SubmitRegistrationResponse['data'];

export interface SubmitRegistrationInput {
  body: SubmitRegistrationBody;
  /**
   * One UUID per submit attempt (`crypto.randomUUID()`): the same key on a
   * retry of a network failure, a new key after the user edits anything.
   * The server replays the stored result for an identical repeat.
   */
  idempotencyKey: string;
}

/**
 * Write a registration plan — `POST /api/registration/events/{id}/submit` —
 * or, with `body.dryRun`, have the server report the rows it would write.
 * On a real success the browser is about to leave for the native checkout,
 * but the event and roster caches are invalidated anyway so a "back" visit
 * shows the new seat counts and duplicate flags.
 */
export function useSubmitRegistration(
  eventId: number | null,
): UseMutationResult<SubmitRegistrationResponse, Error, SubmitRegistrationInput> {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: SubmitRegistrationInput) => {
      if (eventId === null) return Promise.reject(new Error('No event to register for'));
      return fetchJson<SubmitRegistrationResponse>(
        client,
        `/api/registration/events/${eventId}/submit`,
        'Registration',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(body),
        },
      );
    },
    onSuccess: (result) => {
      if (result.data.dryRun) return;
      void queryClient.invalidateQueries({ queryKey: [REGISTRATION_EVENT_QUERY_KEY, eventId] });
      void queryClient.invalidateQueries({ queryKey: [REGISTRATION_ROSTER_QUERY_KEY, eventId] });
    },
  });
}
