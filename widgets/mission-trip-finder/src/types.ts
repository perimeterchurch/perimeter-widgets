import { z } from 'zod';

/**
 * Mission Trip Finder config. Arrives from the host page as `data-*`
 * attributes (always strings), so numeric/boolean fields use `z.coerce.*`.
 * Defaults mirror the legacy reactwidgets MissionTripFinder, which showed every
 * open GO Journey — including full and invitation-only ones — as a card grid
 * linking to the go-journey-details page.
 */
export const MissionTripFinderConfigSchema = z.object({
  showDescription: z.coerce
    .boolean()
    .default(true)
    .describe("Show the trip's description text on the card."),
  showCost: z.coerce.boolean().default(true).describe('Show the per-participant fundraising goal.'),
  showSpots: z.coerce
    .boolean()
    .default(false)
    .describe('Show remaining spots (e.g. "3 spots left") on trips that have a cap.'),
  hideFull: z.coerce
    .boolean()
    .default(false)
    .describe('Hide trips at capacity instead of badging them "Registration Full".'),
  includePast: z.coerce
    .boolean()
    .default(false)
    .describe('Include closed trips. By default only open GO Journeys are shown.'),
  destinationId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .describe('Filter to one destination (MP Journey Destination ID).'),
  keyword: z.string().optional().describe('Search trip names, destinations, and descriptions.'),
  maxTrips: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .describe('Cap the total number of trips shown.'),
  detailsUrlBase: z
    .string()
    .default('https://www.perimeter.org/global-outreach/go-journey-details/?id=')
    .describe('Base URL each card links to; the trip ID is appended.'),
  emptyMessage: z
    .string()
    .default('No mission trips are open right now.')
    .describe('Message shown when the list has no trips.'),
  defaultImageUrl: z
    .string()
    .optional()
    .describe('Fallback banner URL for trips whose destination has no artwork.'),
  // The mount reads `apiUrl` off the parsed config to pick the API client's
  // base URL, so `data-api-url` only works when the schema declares it —
  // unknown keys are stripped before the mount ever sees them.
  apiUrl: z.string().optional().describe('Override the perimeter-api base URL (advanced).'),
});

export type MissionTripFinderConfig = z.infer<typeof MissionTripFinderConfigSchema>;
