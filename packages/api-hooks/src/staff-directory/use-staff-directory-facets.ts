import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { serializeQuery } from '../internal/serialize-query';
import { fetchJson } from '../internal/fetch-json';

export type UseStaffDirectoryFacetsParams = NonNullable<
  operations['listStaffDirectoryFacets']['parameters']['query']
>;
export type UseStaffDirectoryFacetsResponse =
  operations['listStaffDirectoryFacets']['responses']['200']['content']['application/json'];

/** One selectable option in a staff-directory filter dropdown. */
export type StaffDirectoryFacetOption =
  UseStaffDirectoryFacetsResponse['data']['ministries'][number];

/**
 * Filter options for the staff-directory's dropdowns — the ministries and
 * personnel types at least one visible staff member belongs to. Facets change
 * rarely, so this is cached far longer than the staff list itself. Backs
 * `GET /api/staff-directory/facets`.
 */
export function useStaffDirectoryFacets(
  params?: UseStaffDirectoryFacetsParams,
  options?: { enabled?: boolean },
): UseQueryResult<UseStaffDirectoryFacetsResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['staff-directory-facets', params],
    enabled: options?.enabled ?? true,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const search = serializeQuery(params ?? {});
      return fetchJson<UseStaffDirectoryFacetsResponse>(
        client,
        `/api/staff-directory/facets${search ? `?${search}` : ''}`,
        'Staff directory filters',
      );
    },
  });
}
