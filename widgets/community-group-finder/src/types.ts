import { z } from 'zod';

/**
 * Community Group Finder config. Arrives from the host page as `data-*`
 * attributes (always strings), so numeric/boolean fields use `z.coerce.*`.
 * Defaults mirror the Ministry Platform group-finder widget this replaces:
 * every community group published online, newest first, as a card grid linking
 * to the group-details page.
 */
export const CommunityGroupFinderConfigSchema = z.object({
  showImages: z.coerce
    .boolean()
    .default(true)
    .describe("Show the group's city banner on the card."),
  showDescription: z.coerce
    .boolean()
    .default(true)
    .describe("Show the group's description text on the card."),
  descriptionLimit: z.coerce
    .number()
    .int()
    .positive()
    .default(260)
    .describe('Characters of description shown before truncating with an ellipsis.'),
  showFilters: z.coerce
    .boolean()
    .default(true)
    .describe('Show the filter panel above the results.'),
  showSearch: z.coerce
    .boolean()
    .default(true)
    .describe('Show the keyword search box above the filters.'),
  advancedOpen: z.coerce
    .boolean()
    .default(false)
    .describe('Start with the advanced filters expanded instead of collapsed.'),
  // MP's `showfullgroups` defaults to false (hide them). Perimeter's default is
  // the opposite by choice: full groups stay listed with a badge, so someone
  // scanning the page can see that a group exists and is worth asking about.
  showFullGroups: z.coerce
    .boolean()
    .default(true)
    .describe(
      'Show groups at capacity, badged "Group Is Full". Set false to hide them. A group is full when Group Is Full is set in MP, or its target size has been reached. (MP: showfullgroups)',
    ),
  countGroupInquiries: z.coerce
    .boolean()
    .default(false)
    .describe(
      "Let pending group inquiries count toward a group's target size when deciding whether it is full. (MP: countgroupinquiries)",
    ),
  showFutureGroups: z.coerce
    .boolean()
    .default(true)
    .describe('Show groups whose start date has not arrived yet. (MP: showfuturegroups)'),
  groupTypeId: z.coerce
    .number()
    .int()
    .positive()
    .default(13)
    .describe(
      'MP Group Type. 13 = Community Group; other finder-visible types are 1 (Small Groups), 3 (Class), 10 (Discipleship Group).',
    ),
  neighborhoodIds: z
    .string()
    .optional()
    .describe(
      'Lock the widget to one or more cities (comma-separated MP City Ministry IDs). The City filter is hidden when set.',
    ),
  maxGroups: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .describe('Cap the total number of groups shown.'),
  detailsUrlBase: z
    .string()
    .default('https://www.perimeter.org/group-details/?id=')
    .describe('Base URL each card links to; the group ID is appended.'),
  detailsLabel: z.string().default('See Details').describe('Label on the card link.'),
  emptyMessage: z
    .string()
    .default('No community groups match your filters.')
    .describe('Message shown when the list has no groups.'),
  defaultImageUrl: z
    .string()
    .optional()
    .describe('Fallback banner URL for groups with no artwork in MP.'),
  // The mount reads `apiUrl` off the parsed config to pick the API client's
  // base URL, so `data-api-url` only works when the schema declares it —
  // unknown keys are stripped before the mount ever sees them.
  apiUrl: z.string().optional().describe('Override the perimeter-api base URL (advanced).'),
});

export type CommunityGroupFinderConfig = z.infer<typeof CommunityGroupFinderConfigSchema>;
