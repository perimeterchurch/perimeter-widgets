/**
 * What the widget remembers about a registration it sent to Online Giving.
 *
 * The browser leaves the page to pay and comes back by a return URL that
 * carries only Online Giving's response token: no event id, no invoice, no
 * draft. This record, written just before leaving, is how the return knows
 * which event it was, what was registered and what was owed. It also covers
 * a visitor who backs out of Online Giving (browser back lands on the page
 * with an empty draft and an unpaid invoice) so they can pay or start over.
 *
 * localStorage rather than sessionStorage: iOS may rebuild a backgrounded
 * tab from scratch, and the record has its own expiry anyway.
 */
export interface PendingPaymentSummary {
  attendees: { name: string; detail: string }[];
  extras: { title: string; detail: string } | null;
}

export interface PendingPayment {
  eventId: number;
  invoiceGuid: string;
  invoiceTotal: number;
  summary: PendingPaymentSummary;
  /** Epoch ms when the browser left for payment. */
  savedAt: number;
}

export const PENDING_PAYMENT_KEY = 'perimeter-widgets:event-registration:pending-payment';

/** MP releases unpaid seats after about an hour, but a late return still has to confirm its token. */
export const PENDING_PAYMENT_TTL_MS = 24 * 60 * 60 * 1000;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function storage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function savePendingPayment(
  record: Omit<PendingPayment, 'savedAt'>,
  now: number = Date.now(),
  store: StorageLike | null = storage(),
): void {
  try {
    store?.setItem(PENDING_PAYMENT_KEY, JSON.stringify({ ...record, savedAt: now }));
  } catch {
    // Private mode or a full quota: the return will confirm the payment without a summary.
  }
}

export function readPendingPayment(
  now: number = Date.now(),
  store: StorageLike | null = storage(),
): PendingPayment | null {
  try {
    const raw = store?.getItem(PENDING_PAYMENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingPayment>;
    if (
      typeof parsed.eventId !== 'number' ||
      typeof parsed.invoiceGuid !== 'string' ||
      typeof parsed.invoiceTotal !== 'number' ||
      typeof parsed.savedAt !== 'number' ||
      !parsed.summary ||
      !Array.isArray(parsed.summary.attendees)
    ) {
      return null;
    }
    if (now - parsed.savedAt > PENDING_PAYMENT_TTL_MS) {
      store?.removeItem(PENDING_PAYMENT_KEY);
      return null;
    }
    return {
      eventId: parsed.eventId,
      invoiceGuid: parsed.invoiceGuid,
      invoiceTotal: parsed.invoiceTotal,
      summary: { attendees: parsed.summary.attendees, extras: parsed.summary.extras ?? null },
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function clearPendingPayment(store: StorageLike | null = storage()): void {
  try {
    store?.removeItem(PENDING_PAYMENT_KEY);
  } catch {
    // nothing to clear
  }
}
