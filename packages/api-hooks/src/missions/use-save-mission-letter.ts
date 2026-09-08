import type { operations } from '../generated/operations';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { fetchJson } from '../internal/fetch-json';

/** Request body for the letter write. */
export type SaveMissionLetterBody =
  operations['saveMissionLetter']['requestBody']['content']['application/json'];

export type SaveMissionLetterResponse =
  operations['saveMissionLetter']['responses']['200']['content']['application/json'];

/** The pledge to write to, plus the body. */
export interface SaveMissionLetterInput extends SaveMissionLetterBody {
  pledgeId: number;
}

/**
 * Save a participant's support letter for one trip pledge.
 *
 * `PUT /api/missions/my-trips/{pledgeId}/letter` — a full replacement of the
 * letter body, so PUT rather than POST. The endpoint refuses a pledge outside
 * the caller's own donor records, and sanitizes the HTML before storing it, so
 * the `letter` that comes back may differ from what was sent. On success the
 * cached `['my-mission-trips']` list is invalidated to re-read the stored
 * value rather than trusting local state.
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
