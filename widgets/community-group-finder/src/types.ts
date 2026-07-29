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
    .describe("Show the group's neighborhood banner on the card."),
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
  hideFull: z.coerce
    .boolean()
    .default(false)
    .describe('Hide groups at capacity instead of badging them "Group Is Full".'),
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
      'Lock the widget to one or more neighborhoods (comma-separated MP City Ministry IDs). The Neighborhood filter is hidden when set.',
    ),
  location: z.string().optional().describe('Preset the City or Postal Code box.'),
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
