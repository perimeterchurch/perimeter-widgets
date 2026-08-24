import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { fetchJson } from '../internal/fetch-json';

export type UsePrayerWallIdentityResponse =
  operations['getPrayerWallIdentity']['responses']['200']['content']['application/json'];

/**
 * The signed-in visitor's own name, for the form's read-only "Me" field. Backs
 * `GET /api/prayer-wall/me`, which requires the MP bearer token — pass
 * `enabled: false` when there is no session, or the request 401s on every
 * anonymous page view.
 */
export function usePrayerWallIdentity(options?: {
  enabled?: boolean;
}): UseQueryResult<UsePrayerWallIdentityResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['prayer-wall-identity'],
    enabled: options?.enabled ?? true,
    // The name behind a token does not change mid-session.
    staleTime: Infinity,
    retry: false,
    queryFn: () =>
      fetchJson<UsePrayerWallIdentityResponse>(
        client,
        '/api/prayer-wall/me',
        'Prayer wall identity',
      ),
  });
}
