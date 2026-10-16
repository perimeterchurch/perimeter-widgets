import { detectMPAppRoot } from '@perimeter/auth';

/**
 * The slice of MinistryPlatform's widgets Checkout API that the native
 * Invoice Details & Payment page (`<mpp-checkout>`) uses to take a payment,
 * called from this widget instead so the native page drops out of the flow
 * (Dana, 2026-10-16).
 *
 * The card itself is never collected here, or by MP's own widget: the API
 * mints a signed payment-request token, the browser is sent to Online
 * Giving's hosted page with it, and Online Giving returns to `returnUrl`
 * with a response token that is posted back to record the payment in MP.
 * Endpoints and shapes were read from MP's `widgets/dist/Checkout.js`
 * bundle; they are MP-internal, so every caller keeps the native checkout
 * page as a fallback.
 */

export type PaymentOption = 'full' | 'deposit' | 'other';

export interface PaymentRequest {
  invoiceGuid: string;
  /** Online Giving's MP payments page (`paymentProcessorTargetUrl` on the native page). */
  audienceUrl: string;
  /** Where Online Giving sends the browser back; it appends `?token=<response>`. */
  returnUrl: string;
  amountToPay: number;
  paymentOption: PaymentOption;
}

export interface PaymentResponseResult {
  success: boolean;
  /** Online Giving took the money but MP has not yet been told; the payment shows up later. */
  paymentReceived?: boolean;
  paymentNotified?: boolean;
  /** The invoice's GUID. */
  invoiceId?: string;
  /** An i18n key or message when `success` is false. */
  Details?: string;
}

interface CsrfToken {
  token: string;
  expiresAfterUtc: string;
}

export class MPCheckoutError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'MPCheckoutError';
  }
}

/** The MP widgets app root: an explicit override, else the MPWidgets/UserLogin `<script>` on the page. */
export function resolveMPAppRoot(override: string | undefined): string | null {
  if (override) return override.replace(/\/$/, '');
  if (typeof document === 'undefined') return null;
  return detectMPAppRoot();
}

/** `<processorUrl>?token=<token>`, respecting an existing query string. */
export function paymentPageUrl(processorUrl: string, token: string): string {
  const sep = processorUrl.includes('?') ? '&' : '?';
  return `${processorUrl}${sep}token=${encodeURIComponent(token)}`;
}

export class MPCheckoutClient {
  constructor(
    private readonly appRoot: string,
    private readonly getToken: () => string | null,
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
  ) {}

  /** A signed token Online Giving accepts for this invoice, amount and return address. */
  async buildPaymentRequestToken(request: PaymentRequest): Promise<string> {
    const params = new URLSearchParams({
      invoiceId: request.invoiceGuid,
      audienceUrl: request.audienceUrl,
      returnUrl: request.returnUrl,
      amountToPay: request.amountToPay.toFixed(2),
      paymentOption: request.paymentOption,
    });
    const body = await this.request<{ token?: string | null }>(
      `${this.appRoot}/Api/CheckoutApi/BuildPaymentRequestToken?${params.toString()}`,
      { method: 'GET' },
    );
    if (!body?.token) throw new MPCheckoutError(200, 'MP returned no payment token');
    return body.token;
  }

  /** Post Online Giving's response token back so MP records the payment. */
  async processPaymentResponse(responseToken: string): Promise<PaymentResponseResult> {
    const csrf = await this.csrfToken();
    const form = new FormData();
    form.append('text', responseToken);
    const result = await this.request<PaymentResponseResult>(
      `${this.appRoot}/Api/CheckoutApi/ProcessPaymentResponse`,
      { method: 'POST', body: form, headers: csrf ? { 'x-csrf-token': csrf } : {} },
    );
    return result ?? { success: false };
  }

  private async csrfToken(): Promise<string | null> {
    try {
      const res = await this.fetchImpl(`${this.appRoot}/Home/CSRFToken`);
      if (!res.ok) return null;
      const body = (await res.json()) as Partial<CsrfToken> | null;
      return body?.token ?? null;
    } catch {
      return null;
    }
  }

  private async request<T>(url: string, init: RequestInit): Promise<T | null> {
    const token = this.getToken();
    // Same as MP's own widgets: the bearer token and MP's cookies when signed
    // in; a guest's request carries neither (the invoice GUID is the secret).
    const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await this.fetchImpl(url, {
      ...init,
      headers,
      ...(token ? { credentials: 'include' } : {}),
    });
    if (!res.ok) {
      throw new MPCheckoutError(
        res.status,
        res.status === 401 ? 'Authentication required' : `MP checkout API ${res.status}`,
      );
    }
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  }
}
