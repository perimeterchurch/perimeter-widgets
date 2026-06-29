import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { fetchJson } from '../internal/fetch-json';

export type UseGivingHistoryResponse =
  operations['getGivingHistory']['responses']['200']['content']['application/json'];

/** A single giving-history row (one donation distribution). */
export type GivingHistoryItem = UseGivingHistoryResponse['data']['items'][number];

/**
 * The signed-in user's household giving history (one row per donation
 * distribution, newest first). Authenticated: the bearer token is attached by
 * the api-client from the widget's auth provider, and the endpoint derives the
 * household entirely from that token — there are no params.
 */
export function useGivingHistory(options?: {
  enabled?: boolean;
}): UseQueryResult<UseGivingHistoryResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['giving-history'],
    enabled: options?.enabled ?? true,
    queryFn: () =>
      fetchJson<UseGivingHistoryResponse>(client, '/api/giving/history', 'Giving history'),
  });
}
