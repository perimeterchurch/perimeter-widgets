import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { fetchJson } from '../internal/fetch-json';

/**
 * NOTE — hand-written types, pending the perimeter-api endpoint. See the note
 * in `use-my-mission-trips.ts`; the same applies here.
 *
 * This replaces a direct browser POST to a hard-coded Azure Logic App URL
 * (`prod-90.westus.logic.azure.com/workflows/b3769b5d…?sig=…`) in the legacy
 * widget — a shared signing key shipped in client JS, writing to
 * `Pledges.Letter` with no check that the caller owns the pledge. The
 * replacement endpoint must authorize the write against the caller's own
 * donor/household before updating.
 */

export interface SaveMissionLetterInput {
  pledgeId: number;
  /** The letter body as HTML. */
  letter: string;
}

export interface SaveMissionLetterResponse {
  data: {
    pledgeId: number;
    letter: string;
  };
}

/**
 * Save a participant's support letter for one trip pledge.
 *
 * `PUT /api/missions/my-trips/{pledgeId}/letter` — a full replacement of the
 * letter body, so PUT rather than POST. On success the cached
 * `['my-mission-trips']` list is invalidated so the trip's letter and any
 * derived UI re-read from the server rather than trusting local state.
 */
export function useSaveMissionLetter(): UseMutationResult<
  SaveMissionLetterResponse,
  Error,
  SaveMissionLetterInput
> {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pledgeId, letter }: SaveMissionLetterInput) =>
      fetchJson<SaveMissionLetterResponse>(
        client,
        `/api/missions/my-trips/${pledgeId}/letter`,
        'Save mission letter',
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ letter }),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-mission-trips'] });
    },
  });
}
