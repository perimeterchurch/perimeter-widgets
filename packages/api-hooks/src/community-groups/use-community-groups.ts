import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { serializeQuery } from '../internal/serialize-query';
import { fetchJson } from '../internal/fetch-json';

export type UseCommunityGroupsParams = NonNullable<
  operations['listCommunityGroups']['parameters']['query']
>;
export type UseCommunityGroupsResponse =
  operations['listCommunityGroups']['responses']['200']['content']['application/json'];

/** A single community group as returned by the community-group list endpoint. */
export type CommunityGroup = UseCommunityGroupsResponse['data']['groups'][number];

/**
 * List community groups for the community-group-finder widget. Groups published
 * online and not yet ended, of type 13 (Community Group) by default.
 *
 * Every `*Ids` filter is a comma-separated string so one request backs a
 * multi-select: values within a filter are OR-ed, separate filters AND-ed.
 * Backs `GET /api/community-groups`.
 */
export function useCommunityGroups(
  params?: UseCommunityGroupsParams,
  options?: { enabled?: boolean },
): UseQueryResult<UseCommunityGroupsResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['community-groups', params],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const search = serializeQuery(params ?? {});
      return fetchJson<UseCommunityGroupsResponse>(
        client,
        `/api/community-groups${search ? `?${search}` : ''}`,
        'Community groups',
      );
    },
  });
}
