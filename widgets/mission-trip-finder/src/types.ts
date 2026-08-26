import { z } from 'zod';

/**
 * Mission Trip Finder config. Arrives from the host page as `data-*`
 * attributes (always strings), so numeric/boolean fields use `z.coerce.*`.
 * Defaults mirror the legacy reactwidgets MissionTripFinder, which showed every
 * open GO Journey — including full and invitation-only ones — as a card grid.
 * Since 0.2.0 a card opens the trip's detail view in place rather than linking
 * out to the go-journey-details page; `detailsUrlBase` restores the old
 * hand-off for embeds that still want it.
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
    .optional()
    .describe(
      'Link cards OUT to this URL (the trip ID is appended) instead of opening the ' +
        "widget's own detail view. Leave unset — the default — and a card opens the " +
        'detail in place. Setting it restores the pre-0.2.0 behaviour of handing off ' +
        'to a separate details page.',
    ),
  tripId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Open straight to this trip's detail view, with no list behind it. This is what " +
        'lets one embed stand in for a dedicated details page: point it at ' +
        '?id=<trip> from the host page and the widget renders that trip alone.',
    ),
  fullBleedHero: z.coerce
    .boolean()
    .default(true)
    .describe(
      "Stretch the detail view's cover photo across the full page width, escaping the host " +
        "page's content container. Turn this off for an embed in a sidebar or a narrow " +
        'column, where a page-wide hero would overwhelm it.',
    ),
  showTeam: z.coerce
    .boolean()
    .default(true)
    .describe('Show the "Meet the Team" roster on the detail view.'),
  registerUrl: z
    .string()
    .default(
      'https://www.perimeter.org/pages/outreach-volunteer/global-outreach/global-outreach/pages/mission-trip-application/?pledgecampaignid={id}',
    )
    .describe(
      'Destination of the "Register to Join" button. `{id}` is replaced with the trip ID. ' +
        'Hidden automatically on trips that are full or invitation-only.',
    ),
  supportUrl: z
    .string()
    .default('https://perimeter.onlinegiving.org/donate/form/1385?mp_campaign_id={id}#!/')
    .describe(
      'Destination of the "Support Journey" button. `{id}` is replaced with the trip ID. ' +
        'A template rather than a base URL because the giving form needs its `#!/` ' +
        'fragment AFTER the campaign ID.',
    ),
  participantUrl: z
    .string()
    .optional()
    .describe(
      'Link each team member to their own support page. `{pledgeId}` and `{id}` are ' +
        'replaced with the participant and trip IDs. Unset by default, in which case ' +
        'team cards are not links — the legacy template had a placeholder href that ' +
        'was never wired up to anything.',
    ),
  disclaimerText: z
    .string()
    .default(
      'Donations are tax-deductible and must be made payable to Perimeter Church, who is ' +
        'training and sending the team and who requests that this be above your regular ' +
        'tithe and offerings to your local church. If I raise more than 100%, the ' +
        'additional funds will be allocated to the team fund, and, after that, used at ' +
        'the discretion of the Global Outreach Ministry Team.',
    )
    .describe('Donation disclaimer shown at the foot of the detail view. Empty string hides it.'),
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
