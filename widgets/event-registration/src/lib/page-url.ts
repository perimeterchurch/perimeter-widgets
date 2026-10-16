/**
 * What this page knows about itself: the event it is for, whether the
 * visitor came back from the native checkout with a pending invoice, and
 * whether Online Giving just sent them back with a payment response.
 *
 * The native details widget reads `?id=<Event_ID>` (configurable through MP's
 * `EventDetailWidgetIdParameterName`) and, when the checkout's "Make Changes"
 * returns, `&invoiceid=<Invoice_GUID>`. Reading the same parameters keeps a
 * link that works for the native page working for this one. Online Giving
 * returns to the page's bare URL with `?token=<response>` (2026-10-16), the
 * same parameter the native checkout page reads.
 */
export interface PageContext {
  eventId: number | null;
  /** Set when the URL carries an `invoiceid` — a checkout the visitor abandoned or backed out of. */
  pendingInvoiceGuid: string | null;
  /** Online Giving's payment response token, present only on the way back from paying. */
  paymentToken: string | null;
  /** The page's own URL without the query string, for the External_Registration_URL self-check and as the payment return address. */
  pageUrl: string | null;
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMPTY = { pendingInvoiceGuid: null, paymentToken: null, pageUrl: null };

export function readPageContext(
  idParam: string,
  pinnedEventId: number | undefined,
  href: string | undefined = typeof window === 'undefined' ? undefined : window.location.href,
): PageContext {
  if (!href) return { eventId: pinnedEventId ?? null, ...EMPTY };

  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return { eventId: pinnedEventId ?? null, ...EMPTY };
  }

  const fromQuery = url.searchParams.get(idParam);
  const parsed = fromQuery !== null && /^\d+$/.test(fromQuery) ? Number(fromQuery) : null;
  const invoice = url.searchParams.get('invoiceid');
  const token = url.searchParams.get('token');

  return {
    eventId: pinnedEventId ?? parsed,
    pendingInvoiceGuid: invoice && GUID.test(invoice) ? invoice : null,
    paymentToken: token && token.trim() ? token : null,
    pageUrl: `${url.origin}${url.pathname}`,
  };
}

/** `<checkoutUrl>?<invoiceParam>=<guid>`, respecting an existing query string. */
export function buildCheckoutUrl(checkoutUrl: string, invoiceParam: string, guid: string): string {
  const sep = checkoutUrl.includes('?') ? '&' : '?';
  return `${checkoutUrl}${sep}${encodeURIComponent(invoiceParam)}=${encodeURIComponent(guid)}`;
}

/** The same URL without the named query parameters (and without a dangling `?`). */
export function withoutQueryParams(href: string, names: readonly string[]): string {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  for (const name of names) url.searchParams.delete(name);
  return url.toString();
}
