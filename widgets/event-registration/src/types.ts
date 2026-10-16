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
    .default('https://www.perimeter.org/event-checkout/')
    .describe(
      'The native Invoice Details & Payment page. The browser is sent to `<checkoutUrl>?<invoiceParam>=<Invoice_GUID>` after a successful submit. Defaults to the perimeter.org checkout page.',
    ),
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
  paymentFlow: z
    .enum(['direct', 'native'])
    .default('direct')
    .describe(
      "`direct` (default): after a paid submit the widget performs Online Giving's silent sign-on, asks MP's checkout API for a payment token, sends the browser straight to Online Giving and confirms the payment when it returns here. `native`: hand off to `checkoutUrl`, the native Invoice Details & Payment page. Deposits and any failure to reach MP's API use the native page either way. (2026-10-16: the first direct build, without the sign-on, got visitors' networks blocked by Online Giving's bot detection; the page is not public while this is verified.)",
    ),
  paymentUrl: z
    .string()
    .url()
    .default('https://perimeter.onlinegiving.org/mp/payments/')
    .describe(
      "Online Giving's MP payments page, the `paymentprocessortargeturl` of the native <mpp-checkout>. The browser goes to `<paymentUrl>?token=<payment request token>`.",
    ),
  mpWidgetsUrl: z
    .string()
    .url()
    .optional()
    .describe(
      'Root of the MP widgets app (e.g. https://ministryplatform.perimeter.org/widgets), whose checkout API mints payment tokens. Auto-detected from the MPWidgets/UserLogin <script> on the page; set it only where that script is absent.',
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
  stickyTopOffset: z.coerce
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      'Height in pixels of a fixed host-page header, so the sticky summary bar on phones sits below it instead of under it.',
    ),
  apiUrl: z.string().optional().describe('Override the perimeter-api base URL (advanced).'),
});

export type EventRegistrationConfig = z.infer<typeof EventRegistrationConfigSchema>;

/** reCAPTCHA action the server expects for guest submits. */
export const RECAPTCHA_ACTION = 'event_registration';
