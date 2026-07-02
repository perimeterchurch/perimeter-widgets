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
  detailsLabel: z.string().default('See Details').describe('Text for the details link.'),
  emptyMessage: z
    .string()
    .default('No upcoming events.')
    .describe('Message shown when the list has no events.'),
  apiUrl: z.string().optional().describe('Override the perimeter-api base URL (advanced).'),
});

export type EventFinderConfig = z.infer<typeof EventFinderConfigSchema>;
