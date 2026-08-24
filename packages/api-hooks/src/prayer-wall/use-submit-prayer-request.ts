import type { operations } from '../generated/operations';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { fetchJson } from '../internal/fetch-json';
import { PRAYER_REQUESTS_QUERY_KEY } from './use-prayer-requests';

/** Request body for a prayer-request submission (includes the reCAPTCHA token). */
export type SubmitPrayerRequestInput =
  operations['submitPrayerRequest']['requestBody']['content']['application/json'];

export type SubmitPrayerRequestResponse =
  operations['submitPrayerRequest']['responses']['201']['content']['application/json'];

/**
 * Submit a prayer or praise request. Posts to `POST /api/prayer-wall/requests`,
 * which verifies the reCAPTCHA token and writes the request to Ministry
 * Platform **unapproved** — it appears on the wall only once staff approve it,
 * which is why the result carries `pendingApproval` and the form says so.
 *
 * The feed is invalidated on success anyway: nothing new shows up, but a
 * signed-in member who resubmits should never see a stale page.
 */
export function useSubmitPrayerRequest(): UseMutationResult<
  SubmitPrayerRequestResponse,
  Error,
  SubmitPrayerRequestInput
> {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitPrayerRequestInput) =>
      fetchJson<SubmitPrayerRequestResponse>(
        client,
        '/api/prayer-wall/requests',
        'Prayer request',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PRAYER_REQUESTS_QUERY_KEY] });
    },
  });
}
