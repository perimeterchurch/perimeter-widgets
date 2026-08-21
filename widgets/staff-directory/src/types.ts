import { z } from 'zod';

/**
 * Staff Directory config. Arrives from the host page as `data-*` attributes
 * (always strings), so numeric/boolean fields use `z.coerce.*`.
 *
 * Defaults reproduce the legacy `reactwidgets` Staff widget: every
 * website-visible staff member, alphabetical by last name, as a four-column
 * grid of photo cards linking to the staff-contact form.
 *
 * Two legacy attributes have no equivalent here. `data-elt` / `data-emt`
 * rendered the Executive Leadership and Elder Ministry Team sections, which the
 * new HR tables cannot identify (and ruling elders are not staff at all).
 * `data-params` passed raw arguments to the retired stored proc; the filters
 * below replace it.
 */
export const StaffDirectoryConfigSchema = z.object({
  title: z
    .string()
    .default('All Staff')
    .describe('Heading above the grid. Set blank to omit the heading entirely.'),
  intro: z
    .string()
    .default('Search staff members by name, keyword, or department.')
    .describe('Line of copy under the heading. Set blank to omit it.'),
  showSearch: z.coerce
    .boolean()
    .default(true)
    .describe('Show the keyword search box above the grid.'),
  showMinistryFilter: z.coerce
    .boolean()
    .default(true)
    .describe(
      'Show the ministry dropdown — what the legacy widget called "All Departments". Hidden automatically when the widget is locked to specific ministries.',
    ),
  showPositions: z.coerce
    .boolean()
    .default(true)
    .describe("Show the person's job title(s) under their name on the card."),
  showMinistryOnCard: z.coerce
    .boolean()
    .default(false)
    .describe(
      "Also show the position's ministry on the card. Off by default — the legacy widget showed the title alone.",
    ),
  columns: z.coerce
    .number()
    .int()
    .min(1)
    .max(6)
    .default(4)
    .describe('Cards per row on a wide container. Steps down automatically on narrower ones.'),
  ministryIds: z
    .string()
    .optional()
    .describe(
      'Lock the widget to one or more ministries (comma-separated MP Ministry IDs, e.g. 3 = Accounting, 14 = High School). The ministry dropdown is hidden when set. Replaces the legacy `data-department` mode.',
    ),
  personnelTypeIds: z
    .string()
    .optional()
    .describe(
      'Limit to certain employment types (comma-separated MP Personnel Type IDs: 1 Full Time Exempt, 2 Full Time Not Exempt, 3 Part Time Not Exempt, 4 Contractor/1099, 5 Intern, 6 Unpaid Volunteer, 7 Resident, 8 Part Time Exempt). Unset shows every type.',
    ),
  contactIds: z
    .string()
    .optional()
    .describe(
      'Pin the grid to a hand-picked roster (comma-separated MP Contact IDs). Replaces the legacy `data-employees` Employee ID list — Contact IDs are the modern key.',
    ),
  maxStaff: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .describe('Cap the number of people shown.'),
  linkCards: z.coerce
    .boolean()
    .default(true)
    .describe(
      'Link each card to the contact page. Off renders a plain, non-clickable grid — the legacy widget did this for its leadership sections.',
    ),
  // Named after MP's own `targeturl` convention, which is the word the people
  // configuring these pages already use. The Contact GUID is appended, so this
  // ends in the query parameter that carries it.
  targetUrl: z
    .string()
    .default('https://www.perimeter.org/staff-contact/?contactGuid=')
    .describe(
      'Page each card links to, with the Contact GUID appended. Replaces the legacy `?eid=<Employee ID>` scheme. (MP: targeturl)',
    ),
  defaultPhotoUrl: z
    .string()
    .optional()
    .describe(
      'Fallback photo for staff with no headshot in MP. Unset renders initials on a plain tile instead, which costs no extra request.',
    ),
  emptyMessage: z
    .string()
    .default('We couldn’t find any staff members matching your search criteria.')
    .describe('Message shown when nobody matches the search.'),
  // The mount reads `apiUrl` off the parsed config to pick the API client's
  // base URL, so `data-api-url` only works when the schema declares it —
  // unknown keys are stripped before the mount ever sees them.
  apiUrl: z.string().optional().describe('Override the perimeter-api base URL (advanced).'),
});

export type StaffDirectoryConfig = z.infer<typeof StaffDirectoryConfigSchema>;
