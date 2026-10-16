import * as React from 'react';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import { Button } from '@perimeter/ui/button';
import { Spinner } from '@perimeter/ui/spinner';
import type { RegistrationEvent } from '@perimeter/api-hooks';
import type { PendingPayment } from '../lib/pending-payment';
import { formatEventRange, formatMoney } from '../lib/format';

export type PaymentReturnState =
  | { status: 'processing' }
  /** MP recorded the payment. */
  | { status: 'paid'; pending: PendingPayment | null }
  /** Online Giving took the payment but MP has not been told yet; it posts later. */
  | { status: 'received'; pending: PendingPayment | null }
  | { status: 'failed'; message: string; pending: PendingPayment | null };

export interface PaymentReturnProps {
  state: PaymentReturnState;
  /** Null when the page came back without an event (no `?id=` and no saved record). */
  event: RegistrationEvent | null;
  /** The native Invoice Details & Payment page for the invoice, when it is known. */
  checkoutHref: string | null;
  /** Send the browser to Online Giving again for the same invoice. */
  onRetry: (() => void) | null;
  retrying: boolean;
  /** Bring the cards back for a forgotten family member. */
  onRegisterMore: (() => void) | null;
  /** Forget the unpaid invoice and build a new registration. */
  onStartOver: () => void;
}

/**
 * What the visitor sees when Online Giving sends them back here (2026-10-16).
 * The widget posts the response token to MP's checkout API, then confirms
 * the registration in place, the same way the free path does, using the
 * summary saved before the browser left. The native Invoice Details &
 * Payment page is out of the flow; it stays reachable as the fallback when
 * the confirmation cannot be made.
 */
export function PaymentReturn({
  state,
  event,
  checkoutHref,
  onRetry,
  retrying,
  onRegisterMore,
  onStartOver,
}: PaymentReturnProps): React.JSX.Element {
  const eventLine = event
    ? `${event.title} · ${formatEventRange(event.startDate, event.endDate, event.timeZone)}`
    : null;

  if (state.status === 'processing') {
    return (
      <section
        aria-labelledby="payment-return-title"
        aria-busy="true"
        data-slot="payment-return"
        className="grid gap-3 border border-secondary bg-bg p-4 @min-[480px]:p-6"
      >
        <div className="flex items-center gap-3">
          <Spinner />
          <h2 id="payment-return-title" className="font-sans text-xl font-bold text-fg">
            Confirming your payment…
          </h2>
        </div>
        {eventLine && <p className="font-sans text-sm text-muted-fg">{eventLine}</p>}
      </section>
    );
  }

  if (state.status === 'failed') {
    return (
      <section
        aria-labelledby="payment-return-title"
        data-slot="payment-return"
        className="grid gap-4 border border-secondary bg-bg p-4 @min-[480px]:p-6"
      >
        <div className="flex items-start gap-3">
          <TriangleAlert aria-hidden className="mt-0.5 size-7 shrink-0 text-destructive" />
          <div className="grid gap-1">
            <h2 id="payment-return-title" className="font-sans text-xl font-bold text-fg">
              Payment not completed
            </h2>
            <p className="font-sans text-sm text-muted-fg">{state.message}</p>
            {eventLine && <p className="font-sans text-sm text-muted-fg">{eventLine}</p>}
          </div>
        </div>
        <p className="font-sans text-sm text-muted-fg">
          Your registration is saved and waiting for payment. Unpaid registrations are released
          after about an hour.
        </p>
        <div className="flex flex-wrap gap-3">
          {onRetry && (
            <Button type="button" size="lg" onClick={onRetry} disabled={retrying}>
              {retrying ? <Spinner /> : 'Try again'}
            </Button>
          )}
          {checkoutHref && (
            <Button
              size="lg"
              variant={onRetry ? 'outline' : 'primary'}
              nativeButton={false}
              render={<a href={checkoutHref} />}
            >
              Open the payment page
            </Button>
          )}
          <Button type="button" variant="outline" size="lg" onClick={onStartOver}>
            Start over
          </Button>
        </div>
      </section>
    );
  }

  const pending = state.pending;
  const received = state.status === 'received';
  return (
    <section
      aria-labelledby="payment-return-title"
      data-slot="payment-return"
      className="grid gap-4 border border-secondary bg-bg p-4 @min-[480px]:p-6"
    >
      <div className="flex items-start gap-3">
        <CircleCheck aria-hidden className="mt-0.5 size-7 shrink-0 text-primary" />
        <div className="grid gap-1">
          <h2 id="payment-return-title" className="font-sans text-xl font-bold text-fg">
            You&apos;re registered
          </h2>
          {eventLine && <p className="font-sans text-sm text-muted-fg">{eventLine}</p>}
          <p className="font-sans text-sm text-fg" data-slot="payment-status">
            {received ? 'Payment received' : 'Payment complete'}
            {pending && pending.invoiceTotal > 0 ? ` · ${formatMoney(pending.invoiceTotal)}` : ''}
          </p>
          {received && (
            <p className="font-sans text-sm text-muted-fg">
              It can take a few minutes to show on your registration. Keep the receipt email from
              Online Giving.
            </p>
          )}
        </div>
      </div>

      {pending && (pending.summary.attendees.length > 0 || pending.summary.extras) && (
        <ul className="grid gap-2">
          {pending.summary.attendees.map((a, i) => (
            <li
              key={`${a.name}-${i}`}
              className="grid gap-0.5 border border-border bg-muted/40 px-3 py-2"
            >
              <span className="font-sans text-sm font-medium text-fg">{a.name}</span>
              <span className="font-sans text-xs text-muted-fg">{a.detail}</span>
            </li>
          ))}
          {pending.summary.extras && (
            <li
              className="grid gap-0.5 border border-border bg-muted/40 px-3 py-2"
              data-slot="complete-extras"
            >
              <span className="font-sans text-sm font-medium text-fg">
                {pending.summary.extras.title}
              </span>
              <span className="font-sans text-xs text-muted-fg">
                {pending.summary.extras.detail}
              </span>
            </li>
          )}
        </ul>
      )}

      {/* No "a confirmation will be sent to …" line, as on the free path: MP's
          Registrant Message decides whether anything is sent and to whom. */}

      {onRegisterMore && (
        <p className="font-sans text-sm text-muted-fg">
          Forgot someone?{' '}
          <button
            type="button"
            onClick={onRegisterMore}
            className="font-medium text-primary underline underline-offset-4 hover:no-underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            Add another family member
          </button>
        </p>
      )}
    </section>
  );
}
