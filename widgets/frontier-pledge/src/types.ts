import { z } from 'zod';

/**
 * Host-page config for the frontier-pledge widget. Every value arrives as a
 * `data-*` attribute string.
 *
 * The campaign defaults to Frontier, but `pledgeCampaignId` can point the form
 * at another campaign (a church plant's, say). The API is what keeps that safe:
 * `POST /api/giving/pledges` refuses any campaign that does not have online
 * pledges switched on in MP, is a mission trip, or has ended — so a host page
 * can only pick from campaigns staff have opened to online pledging.
 */
export const FrontierPledgeConfigSchema = z.object({
  // Coerced because data-* values are strings. Deliberately strict: a typo
  // must fail the mount rather than quietly pledge to Frontier instead.
  pledgeCampaignId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Ministry Platform Pledge_Campaign_ID to pledge to (data-pledge-campaign-id). The campaign needs Allow Online Pledge on in MP. Default: the Frontier campaign (960).',
    ),
  heading: z
    .string()
    .default('My 3-Year Pledge')
    .describe('Headline above the form (data-heading).'),
  period: z
    .string()
    .default('Jan 2026 - Dec 2028')
    .describe('Pledge period shown under the headline (data-period).'),
  amountLabel: z
    .string()
    .default('Total 3-Year Pledge Amount')
    .describe('Label on the pledge amount field (data-amount-label).'),
  accountUrl: z
    .string()
    .default('https://www.perimeter.org/my-perimeter/')
    .describe(
      'Where the confirmation links a pledger to check their pledge (data-account-url). Leave blank to drop that sentence.',
    ),
  thankYouHeading: z
    .string()
    .default('Thank you for your pledge to the Frontier Campaign!')
    .describe('Heading on the confirmation shown after a pledge (data-thank-you-heading).'),
  // Colors, so a host page with its own brand (a church plant's page) can
  // re-skin the band. Each is a hex color; anything else — including a typo — is
  // ignored by `cssColor` and the brand default is used, rather than failing the
  // whole mount over a cosmetic attribute.
  backgroundColor: z
    .string()
    .optional()
    .describe(
      'Hex color of the band behind the form (data-background-color). Default: brand navy.',
    ),
  textColor: z
    .string()
    .optional()
    .describe(
      'Hex color of the headline, field labels and confirmation text (data-text-color). Default: white.',
    ),
  headingColor: z
    .string()
    .optional()
    .describe('Hex color of the headline only (data-heading-color). Default: the text color.'),
  accentColor: z
    .string()
    .optional()
    .describe(
      'Hex color of the pledge period and the Submit button (data-accent-color). Default: brand amber.',
    ),
  periodColor: z
    .string()
    .optional()
    .describe(
      'Hex color of the pledge period only (data-period-color). Default: the accent color.',
    ),
  buttonTextColor: z
    .string()
    .optional()
    .describe('Hex color of the Submit button text (data-button-text-color). Default: brand navy.'),
  // The mount reads `apiUrl` off the parsed config to point the API client at a
  // specific perimeter-api origin. Leave unset in production (defaults to
  // api.perimeter.org).
  apiUrl: z.string().optional().describe('Override the perimeter-api base URL (advanced).'),
});

export type FrontierPledgeConfig = z.infer<typeof FrontierPledgeConfigSchema>;

/** The contact + amount fields the pledge form collects. */
export interface PledgeFormValues {
  firstName: string;
  spouse: string;
  lastName: string;
  email: string;
  phone: string;
  /** Raw text as typed — parsed to a number only on submit. */
  amount: string;
}

/** Per-field validation messages, keyed by the field they belong to. */
export type PledgeFormErrors = Partial<Record<keyof PledgeFormValues, string>>;
