import type { operations } from '../generated/operations';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { fetchJson } from '../internal/fetch-json';

/** Request body for a staff-contact submission (includes the reCAPTCHA token). */
export type SubmitStaffContactInput =
  operations['submitStaffContact']['requestBody']['content']['application/json'];

export type SubmitStaffContactResponse =
  operations['submitStaffContact']['responses']['201']['content']['application/json'];

/**
 * Submit the staff-contact form. Posts to `POST /api/staff-contact`, which
 * verifies the reCAPTCHA token and creates the Ministry Platform communication
 * that emails the staff member. The widget's only mutation.
 */
export function useSubmitStaffContact(): UseMutationResult<
  SubmitStaffContactResponse,
  Error,
  SubmitStaffContactInput
> {
  const client = useApiClient();
  return useMutation({
    mutationFn: (input: SubmitStaffContactInput) =>
      fetchJson<SubmitStaffContactResponse>(client, '/api/staff-contact', 'Staff contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
  });
}
