import { z } from 'zod';

/**
 * Perimeter's public reCAPTCHA site key (score-based Enterprise), shared with
 * the prayer-wall and staff-contact forms. Overridable per embed.
 */
const DEFAULT_RECAPTCHA_SITE_KEY = '6LfJFoYtAAAAAChdFF8MhIv7ma3l7xG2bJDQdzvk';

/**
 * Host-page config for the event-registration widget. Every value arrives as
 * a `data-*` attribute string, so numbers and booleans are coerced.
 *
 * The event itself comes from the page URL (`?id=<Event_ID>`, the same
 * parameter the native MP details widget reads) unless `data-event-id` pins
 * one — the studio preview and single-event pages use that.
 */
export const EventRegistrationConfigSchema = z.object({
  checkoutUrl: z
    .string()
    .url()
    .describe(
      'The native Invoice Details & Payment page. The browser is sent to `<checkoutUrl>?<invoiceParam>=<Invoice_GUID>` after a successful submit.',
    ),
  returnUrl: z
    .string()
    .default('/events')
    .describe('Where "Back to events" goes. Relative or absolute.'),
  idParam: z
    .string()
    .default('id')
    .describe(
      "Query-string key carrying the Event_ID on this page. Matches MP's EventDetailWidgetIdParameterName (default `id`).",
    ),
  eventId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Pin the event instead of reading it from the query string (studio, fixed-event pages).',
    ),
  invoiceParam: z
    .string()
    .default('id')
    .describe(
      "Query-string key the checkout page reads the Invoice_GUID from. Matches MP's InvoiceDetailWidgetIdParameterName (default `id`).",
    ),
  defaultImageUrl: z.string().optional().describe('Fallback image when the event has none.'),
  showMap: z.coerce
    .boolean()
    .default(true)
    .describe('Show the "Get Directions" link when the location has an address.'),
  recaptchaSiteKey: z
    .string()
    .default(DEFAULT_RECAPTCHA_SITE_KEY)
    .describe('Google reCAPTCHA site key (public), used only for the guest path.'),
  apiUrl: z.string().optional().describe('Override the perimeter-api base URL (advanced).'),
});

export type EventRegistrationConfig = z.infer<typeof EventRegistrationConfigSchema>;

/** reCAPTCHA action the server expects for guest submits. */
export const RECAPTCHA_ACTION = 'event_registration';
