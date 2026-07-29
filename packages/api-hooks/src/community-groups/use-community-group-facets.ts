import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { serializeQuery } from '../internal/serialize-query';
import { fetchJson } from '../internal/fetch-json';

export type UseCommunityGroupFacetsParams = NonNullable<
  operations['listCommunityGroupFacets']['parameters']['query']
>;
export type UseCommunityGroupFacetsResponse =
  operations['listCommunityGroupFacets']['responses']['200']['content']['application/json'];

/** One selectable option in a community-group filter dropdown. */
export type CommunityGroupFacetOption =
  UseCommunityGroupFacetsResponse['data']['neighborhoods'][number];

/**
 * Filter options for the community-group-finder's dropdowns — neighborhoods,
 * focuses, life stages, and meeting days narrowed to values at least one
 * visible group uses, plus the fixed meeting-time buckets. Facets change rarely,
 * so this is cached far longer than the group list itself. Backs
 * `GET /api/community-groups/facets`.
 */
export function useCommunityGroupFacets(
  params?: UseCommunityGroupFacetsParams,
  options?: { enabled?: boolean },
): UseQueryResult<UseCommunityGroupFacetsResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['community-group-facets', params],
    enabled: options?.enabled ?? true,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const search = serializeQuery(params ?? {});
      return fetchJson<UseCommunityGroupFacetsResponse>(
        client,
        `/api/community-groups/facets${search ? `?${search}` : ''}`,
        'Community group filters',
      );
    },
  });
}
