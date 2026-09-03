import { z } from 'zod';

/**
 * Host-page config for the frontier-pledge widget. Every value arrives as a
 * `data-*` attribute string.
 *
 * The campaign itself is NOT configurable: `POST /api/giving/pledges` pins the
 * pledge to the Frontier campaign server-side, so nothing a host page can write
 * is able to redirect a pledge to another campaign. What is configurable is the
 * campaign's presentation — the heading and the pledge period — because those
 * are the parts that change between the campaign page and a re-run of the
 * appeal, and changing them should not need a widget release.
 */
export const FrontierPledgeConfigSchema = z.object({
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
    .describe('Where the confirmation links a pledger to check their pledge (data-account-url).'),
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
