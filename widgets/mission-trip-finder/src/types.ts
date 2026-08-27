import { z } from 'zod';

/**
 * Mission Trip Finder config. Arrives from the host page as `data-*`
 * attributes (always strings), so numeric/boolean fields use `z.coerce.*`.
 * Defaults mirror the legacy reactwidgets MissionTripFinder, which showed every
 * open GO Journey — including full and invitation-only ones — as a card grid
 * linking out to the go-journey-details page. That link-out is still the
 * DEFAULT: `detailsMode: 'inline'` opts an embed into the widget's own detail
 * view, so publishing a new version never changes a live embed's behaviour on
 * its own.
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
  detailsMode: z
    .enum(['link', 'inline'])
    .default('link')
    .describe(
      'What a trip card does when clicked. `link` (the default) hands off to ' +
        '`detailsUrlBase`, which is what every embed did before the detail view existed. ' +
        "`inline` opens the widget's own detail view in place. Defaults to `link` so " +
        'releasing a new version never changes a live embed underneath you — switch an ' +
        'embed over deliberately, when the page is ready for it.',
    ),
  detailsUrlBase: z
    .string()
    .default('https://www.perimeter.org/global-outreach/go-journey-details/?id=')
    .describe(
      'Where a card links to in `link` mode; the trip ID is appended. Ignored in ' +
        '`inline` mode.',
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
  fullBleed: z.coerce
    .boolean()
    .default(true)
    .describe(
      "Let the detail view's photo scroller and testimonial band span the full page width, " +
        "escaping the host page's content container. Turn this off for an embed in a sidebar " +
        'or a narrow column, where page-wide bands would overwhelm it.',
    ),
  showGallery: z.coerce
    .boolean()
    .default(false)
    .describe(
      "Show the detail view's horizontal photo scroller. Off by default: MP has no per-trip " +
        'gallery, so without `galleryUrls` the scroller has only the destination banner to ' +
        'show, which reads as a design element missing its content. Turn it on once the embed ' +
        'supplies photos.',
    ),
  galleryUrls: z
    .string()
    .optional()
    .describe(
      "Comma-separated image URLs for the detail view's photo scroller. Requires " +
        "`showGallery`. With none set the scroller shows the destination's banner image on " +
        'its own. MP has no per-trip gallery today, so these have to be supplied by the embed.',
    ),
  showTestimonials: z.coerce
    .boolean()
    .default(false)
    .describe(
      'Show the "Hear From Others" testimonial band on the detail view. Off by default because ' +
        'the testimonials are hardcoded placeholder copy, not real quotes — see ' +
        'src/lib/testimonials.ts. Do not turn it on until that file holds attributable ' +
        'quotes from real people.',
    ),
  pledgeId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Open straight to one participant's page. Pairs with `tripId` on a dedicated " +
        'participant page, which reads `?pledge=` from its own URL and passes it in.',
    ),
  participantSupportUrl: z
    .string()
    .default(
      'https://perimeter.onlinegiving.org/donate/form/1385?mp_campaign_id={id}&mp_pledge_id={pledgeId}#!/',
    )
    .describe(
      'Destination of the "Support <name>" button on a participant\'s page. `{id}` and ' +
        '`{pledgeId}` are replaced. Defaults to the same giving form as Support Journey ' +
        'with the pledge attached, which is what the legacy participant page used.',
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
