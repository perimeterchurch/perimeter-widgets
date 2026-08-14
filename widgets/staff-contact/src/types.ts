import { z } from 'zod';

/** Perimeter's public reCAPTCHA v2 site key for the staff-contact form. */
const DEFAULT_RECAPTCHA_SITE_KEY = '6Lda7IUtAAAAAFEWjhObewv13I4ANd4SZOFJxgcR';

/**
 * Host-page config for the staff-contact widget. Every value arrives as a
 * `data-*` attribute string.
 *
 * The staff member is identified by their MP Contact GUID — the page that
 * hosts the widget reads it from its own URL (e.g. `?contactGuid=…`) and sets
 * `data-contact-guid`. This replaces the legacy `?eid=<Employee_ID>` scheme.
 */
export const StaffContactConfigSchema = z.object({
  contactGuid: z
    .string()
    .default('')
    .describe('MP Contact GUID of the staff member to email (data-contact-guid).'),
  recaptchaSiteKey: z
    .string()
    .default(DEFAULT_RECAPTCHA_SITE_KEY)
    .describe('Google reCAPTCHA v2 site key (public). Overridable per embed.'),
  // The mount reads `apiUrl` off the parsed config to point the API client and
  // the photo <img> at a specific perimeter-api origin. Leave unset in
  // production (defaults to api.perimeter.org).
  apiUrl: z.string().optional().describe('Override the perimeter-api base URL (advanced).'),
});

export type StaffContactConfig = z.infer<typeof StaffContactConfigSchema>;
