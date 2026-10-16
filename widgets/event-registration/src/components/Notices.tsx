import * as React from 'react';
import { Button } from '@perimeter/ui/button';
import { Spinner } from '@perimeter/ui/spinner';

export function MessageState({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-h-24 items-center justify-center border border-border bg-muted p-6 text-center font-sans text-base text-muted-fg">
      {children}
    </div>
  );
}

/**
 * An unpaid registration is waiting: the visitor backed out of Online Giving
 * (the widget's own saved record, 2026-10-16) or came back from the native
 * checkout with `?invoiceid=<guid>` in the URL (its "Make Changes" / "Back to
 * event" links carry it). Offer to pay rather than a fresh form: in place
 * when the widget knows the amount owed, else on the native checkout page.
 */
export function PendingInvoiceNotice({
  checkoutHref,
  onPayNow,
  paying,
  onStartOver,
}: {
  checkoutHref: string;
  /** Send the browser to Online Giving for the saved invoice; null when only the native page can. */
  onPayNow: (() => void) | null;
  paying: boolean;
  onStartOver: () => void;
}): React.JSX.Element {
  return (
    <div className="grid gap-3 border border-secondary bg-bg p-4 @min-[480px]:p-6">
      <p className="font-sans text-base font-bold text-fg">
        You have a registration waiting for payment.
      </p>
      <p className="font-sans text-sm text-muted-fg">
        Unpaid registrations are released after about an hour. Pay now to keep your spots, or start
        over to build a new registration.
      </p>
      <div className="flex flex-wrap gap-3">
        {onPayNow ? (
          <Button type="button" size="lg" onClick={onPayNow} disabled={paying}>
            {paying ? <Spinner /> : 'Pay now'}
          </Button>
        ) : (
          <Button size="lg" nativeButton={false} render={<a href={checkoutHref} />}>
            Pay now
          </Button>
        )}
        <Button type="button" variant="outline" size="lg" onClick={onStartOver}>
          Start over
        </Button>
      </div>
    </div>
  );
}

export type SignInReason = 'login_required' | 'household_only' | 'guest_allowed';

/**
 * Why the visitor should sign in. `household_only` is a children-only (or
 * otherwise household-filtered) event: a guest could fill the form but has no
 * child to put in it, so the form is not offered.
 */
export function SignInNotice({ reason }: { reason: SignInReason }): React.JSX.Element {
  const copy = {
    login_required: {
      title: 'Please sign in to register.',
      body: 'This event requires a My Perimeter account. Use the login link at the top of the page.',
    },
    household_only: {
      title: 'Sign in to register your family.',
      body: 'Registration for this event is for members of your household (for example your children). Use the login link at the top of the page to see your family.',
    },
    guest_allowed: {
      title: 'Sign in to register your family.',
      body: 'Signed in, you can register anyone in your household at once. Use the login link at the top of the page, or register just yourself below.',
    },
  }[reason];
  return (
    <div className="grid gap-2 border border-secondary bg-bg p-4 @min-[480px]:p-6">
      <p className="font-sans text-base font-bold text-fg">{copy.title}</p>
      <p className="font-sans text-sm text-muted-fg">{copy.body}</p>
    </div>
  );
}

export function ExternalRegistrationNotice({ href }: { href: string }): React.JSX.Element {
  return (
    <div className="grid gap-3 border border-secondary bg-bg p-4 @min-[480px]:p-6">
      <p className="font-sans text-base text-fg">
        Registration for this event happens on another page.
      </p>
      <div>
        <Button size="lg" nativeButton={false} render={<a href={href} />}>
          Register
        </Button>
      </div>
    </div>
  );
}
