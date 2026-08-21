import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { serializeQuery } from '../internal/serialize-query';
import { fetchJson } from '../internal/fetch-json';

export type UseStaffDirectoryParams = NonNullable<
  operations['listStaffDirectory']['parameters']['query']
>;
export type UseStaffDirectoryResponse =
  operations['listStaffDirectory']['responses']['200']['content']['application/json'];

/** One staff member as returned by the staff-directory list endpoint. */
export type StaffDirectoryMember = UseStaffDirectoryResponse['data']['staff'][number];

/** One position a staff member holds. A person can hold several. */
export type StaffDirectoryPosition = StaffDirectoryMember['positions'][number];

/**
 * List staff for the staff-directory widget — people published to the website
 * with every published position they hold, joined to the position's ministry.
 *
 * Every `*Ids` filter is a comma-separated string so one request backs a
 * multi-select: values within a filter are OR-ed, separate filters AND-ed.
 * Backs `GET /api/staff-directory`.
 */
export function useStaffDirectory(
  params?: UseStaffDirectoryParams,
  options?: { enabled?: boolean },
): UseQueryResult<UseStaffDirectoryResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['staff-directory', params],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const search = serializeQuery(params ?? {});
      return fetchJson<UseStaffDirectoryResponse>(
        client,
        `/api/staff-directory${search ? `?${search}` : ''}`,
        'Staff directory',
      );
    },
  });
}
