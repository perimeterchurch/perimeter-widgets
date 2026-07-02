import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { fetchJson } from '../internal/fetch-json';

export type UseShepherdsResponse =
  operations['getShepherds']['responses']['200']['content']['application/json'];

/** A single assigned shepherd/elder row, as returned by `GET /api/shepherds`. */
export type Shepherd = UseShepherdsResponse['data']['shepherds'][number];

/**
 * Fetches the authenticated user's currently assigned shepherds/elders.
 * The endpoint is user-authenticated (the widget mounts with `auth: 'required'`),
 * so the result is per-session — keyed without params and left at the QueryClient
 * default stale time rather than the long facet cache.
 */
export function useShepherds(): UseQueryResult<UseShepherdsResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['shepherds'],
    queryFn: () => fetchJson<UseShepherdsResponse>(client, '/api/shepherds', 'Shepherds'),
  });
}
