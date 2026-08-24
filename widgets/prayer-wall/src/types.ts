import { z } from 'zod';

/**
 * Perimeter's public reCAPTCHA site key (score-based Enterprise), shared with
 * the staff-contact form. Overridable per embed via `data-recaptcha-site-key`.
 */
const DEFAULT_RECAPTCHA_SITE_KEY = '6LfJFoYtAAAAAChdFF8MhIv7ma3l7xG2bJDQdzvk';

/**
 * Host-page config for the prayer-wall widget. Every value arrives as a
 * `data-*` attribute string, so numbers and booleans are coerced.
 *
 * The form and the feed are separate switches because the page they replace
 * mounted them as two instances — a host page that wants only the feed (a
 * sidebar, say) sets `data-show-form="false"`.
 */
export const PrayerWallConfigSchema = z.object({
  formTitle: z
    .string()
    .default('I have a Prayer or Praise Request')
    .describe('Label on the bar that opens the request form.'),
  feedTitle: z
    .string()
    .default('Recent Prayers & Praise')
    .describe('Heading above the list of requests.'),
  showForm: z.coerce.boolean().default(true).describe('Show the request form.'),
  showFeed: z.coerce.boolean().default(true).describe('Show the list of requests.'),
  days: z.coerce
    .number()
    .int()
    .min(1)
    .max(365)
    .default(60)
    .describe('How far back the wall reaches, in days. Defaults to 60.'),
  perPage: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(8)
    .describe('Requests per page. Defaults to 8, matching the current wall.'),
  recaptchaSiteKey: z
    .string()
    .default(DEFAULT_RECAPTCHA_SITE_KEY)
    .describe('Google reCAPTCHA site key (public). Overridable per embed.'),
  apiUrl: z.string().optional().describe('Override the perimeter-api base URL (advanced).'),
});

export type PrayerWallConfig = z.infer<typeof PrayerWallConfigSchema>;

/** The three sharing choices the form offers, in the order it shows them. */
export const PRIVACY_OPTIONS = [
  { value: 'online', label: 'Share Online' },
  { value: 'staff', label: 'Share Only Staff and Shepherding' },
  { value: 'anonymous', label: 'Share Anonymously' },
] as const;

export type PrivacyChoice = (typeof PRIVACY_OPTIONS)[number]['value'];
