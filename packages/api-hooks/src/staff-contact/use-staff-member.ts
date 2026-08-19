import type { operations } from '../generated/operations';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { fetchJson } from '../internal/fetch-json';

export type UseStaffMemberResponse =
  operations['getStaffContactMember']['responses']['200']['content']['application/json'];

/** The staff member behind a Contact GUID: display name and job title. */
export type StaffMember = UseStaffMemberResponse['data'];

/**
 * Fetch a staff member's header details (name, job title) for the staff-contact
 * widget, keyed by their MP Contact GUID. Backs `GET /api/staff-contact/{guid}`.
 * 404s when the GUID is not a currently website-visible employee.
 */
export function useStaffMember(
  contactGuid: string,
  options?: { enabled?: boolean },
): UseQueryResult<UseStaffMemberResponse> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['staff-contact-member', contactGuid],
    enabled: (options?.enabled ?? true) && Boolean(contactGuid),
    queryFn: () =>
      fetchJson<UseStaffMemberResponse>(
        client,
        `/api/staff-contact/${encodeURIComponent(contactGuid)}`,
        'Staff member',
      ),
  });
}
