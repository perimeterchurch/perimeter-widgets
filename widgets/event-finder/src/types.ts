import { z } from 'zod';

/**
 * Event Finder config. Arrives from the host page as `data-*` attributes
 * (always strings), so numeric/boolean fields use `z.coerce.*`. Defaults mirror
 * the legacy reactwidgets EventFinder (`data-show-details` on, everything else
 * off) but replace its raw MP `@EventListID=…` param string with a clean
 * `listId` attribute.
 */
export const EventFinderConfigSchema = z.object({
  listId: z.coerce
    .string()
    .default('')
    .describe('One or more MP Events List IDs, comma-separated, e.g. "18,208".'),
  showImages: z.coerce.boolean().default(false).describe("Show each event's image."),
  showDetails: z.coerce
    .boolean()
    .default(true)
    .describe('Show the "See Details" link (only when the event has one).'),
  showDescription: z.coerce
    .boolean()
    .default(false)
    .describe('Show the event description (rendered as HTML from MP).'),
  altDate: z.coerce
    .boolean()
    .default(false)
    .describe('Use the compact alternate date format: "Fri | September 13 | 6:00 PM".'),
  includePast: z.coerce
    .boolean()
    .default(false)
    .describe('Include past events. By default only upcoming events are shown.'),
  congregationId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .describe('Filter to one congregation (MP Congregation ID).'),
  programId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .describe('Filter to one program (MP Program ID).'),
  tierId: z.string().optional().describe('Filter to one or more Tier IDs, comma-separated.'),
  featured: z.coerce
    .boolean()
    .default(false)
    .describe('Only show events featured on the calendar.'),
  signupType: z
    .enum(['1', '2'])
    .optional()
    .describe('Filter by signup kind: "1" = open registration, "2" = volunteer opportunity.'),
  month: z.coerce
    .number()
    .int()
    .min(1)
    .max(12)
    .optional()
    .describe('Only show events starting in this month (1-12).'),
  keyword: z.string().optional().describe('Search event titles and descriptions.'),
  maxEvents: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .describe('Cap the total number of events shown.'),
  detailsLabel: z.string().default('See Details').describe('Text for the details link.'),
  emptyMessage: z
    .string()
    .default('No upcoming events.')
    .describe('Message shown when the list has no events.'),
  defaultImageUrl: z
    .string()
    .optional()
    .describe('Fallback image URL for events without their own image.'),
  apiUrl: z.string().optional().describe('Override the perimeter-api base URL (advanced).'),
});

export type EventFinderConfig = z.infer<typeof EventFinderConfigSchema>;
