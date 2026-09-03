import type { operations } from '../generated/operations';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { fetchJson } from '../internal/fetch-json';

/** Request body for a campaign pledge (the frontier-pledge widget's form). */
export type CreatePledgeInput =
  operations['createPledge']['requestBody']['content']['application/json'];

/**
 * The pledge that was created.
 *
 * Deliberately the `data` member of the generated 201 type rather than the
 * whole envelope: `POST /api/giving/pledges` is the one perimeter-api route
 * that unwraps its controller's `{ success, data }` result and returns the bare
 * payload, so the spec's enveloped shape does not describe the wire format.
 * Typing off `['data']` keeps the field names spec-derived while matching what
 * actually comes back.
 */
export type CreatePledgeResponse =
  operations['createPledge']['responses']['201']['content']['application/json']['data'];

/**
 * Create a pledge against the Frontier campaign. Posts to
 * `POST /api/giving/pledges`, which matches the pledger to an existing MP
 * contact by name/email/phone (falling back to the generic donor) and writes
 * the Pledges row. Public — the pledge form is an embedded public widget, so
 * no bearer token is attached; production CORS restricts callers to
 * perimeter.org origins.
 *
 * The campaign is fixed server-side; the widget only sends who is pledging and
 * how much.
 */
export function useCreatePledge(): UseMutationResult<
  CreatePledgeResponse,
  Error,
  CreatePledgeInput
> {
  const client = useApiClient();
  return useMutation({
    mutationFn: (input: CreatePledgeInput) =>
      fetchJson<CreatePledgeResponse>(client, '/api/giving/pledges', 'Pledge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
  });
}
