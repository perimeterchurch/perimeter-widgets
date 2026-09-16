/**
 * What this page knows about itself: the event it is for and whether the
 * visitor came back from the native checkout with a pending invoice.
 *
 * The native details widget reads `?id=<Event_ID>` (configurable through MP's
 * `EventDetailWidgetIdParameterName`) and, when the checkout's "Make Changes"
 * returns, `&invoiceid=<Invoice_GUID>`. Reading the same parameters keeps a
 * link that works for the native page working for this one.
 */
export interface PageContext {
  eventId: number | null;
  /** Set when the URL carries an `invoiceid` — a checkout the visitor abandoned or backed out of. */
  pendingInvoiceGuid: string | null;
  /** The page's own URL without the query string, for the External_Registration_URL self-check. */
  pageUrl: string | null;
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readPageContext(
  idParam: string,
  pinnedEventId: number | undefined,
  href: string | undefined = typeof window === 'undefined' ? undefined : window.location.href,
): PageContext {
  if (!href) return { eventId: pinnedEventId ?? null, pendingInvoiceGuid: null, pageUrl: null };

  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return { eventId: pinnedEventId ?? null, pendingInvoiceGuid: null, pageUrl: null };
  }

  const fromQuery = url.searchParams.get(idParam);
  const parsed = fromQuery !== null && /^\d+$/.test(fromQuery) ? Number(fromQuery) : null;
  const invoice = url.searchParams.get('invoiceid');

  return {
    eventId: pinnedEventId ?? parsed,
    pendingInvoiceGuid: invoice && GUID.test(invoice) ? invoice : null,
    pageUrl: `${url.origin}${url.pathname}`,
  };
}

/** `<checkoutUrl>?<invoiceParam>=<guid>`, respecting an existing query string. */
export function buildCheckoutUrl(checkoutUrl: string, invoiceParam: string, guid: string): string {
  const sep = checkoutUrl.includes('?') ? '&' : '?';
  return `${checkoutUrl}${sep}${encodeURIComponent(invoiceParam)}=${encodeURIComponent(guid)}`;
}
