import * as React from 'react';
import { Button } from '@perimeter/ui/button';
import { Spinner } from '@perimeter/ui/spinner';
import { ReviewBody, type ReviewBodyProps } from './ReviewBody';

export interface ReviewPanelProps extends ReviewBodyProps {
  submitting: boolean;
  submitError: string | null;
  canSubmit: boolean;
  isGuest: boolean;
  onSubmit: () => void;
}

/** The submit button's label; shared with the phone CTA so both read the same. */
export function submitLabel(quote: ReviewBodyProps['quote']): string {
  return quote && quote.invoiceTotal > 0
    ? 'Register and continue to payment'
    : 'Complete registration';
}

/** Google's required attribution for the invisible reCAPTCHA on the guest path. */
export function RecaptchaNotice({ className = '' }: { className?: string }): React.JSX.Element {
  return (
    <p className={`font-sans text-xs text-muted-fg ${className}`}>
      This form is protected by reCAPTCHA. Google&apos;s{' '}
      <a
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        Privacy Policy
      </a>{' '}
      and{' '}
      <a
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        Terms of Service
      </a>{' '}
      apply.
    </p>
  );
}

/**
 * The desktop review column: the running total and the submit. The server's
 * quote is authoritative — lines, problems, overlap warnings and the total all
 * come from it — and the submit button stays disabled until the quote says the
 * plan is submittable. On phones the same content lives in `SummaryBar` and
 * the submit in `StickyCta`.
 */
export function ReviewPanel({
  submitting,
  submitError,
  canSubmit,
  isGuest,
  onSubmit,
  ...body
}: ReviewPanelProps): React.JSX.Element {
  return (
    <aside
      className="grid gap-4 border border-secondary bg-bg p-4 @min-[480px]:p-6"
      aria-labelledby="registration-review-title"
    >
      <h3 id="registration-review-title" className="font-sans text-xl font-bold text-fg">
        Your registration
      </h3>

      <ReviewBody {...body} />

      {body.registrationCount > 0 && (
        <>
          {submitError && (
            <p role="alert" className="font-sans text-sm text-destructive">
              {submitError}
            </p>
          )}

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!canSubmit || submitting || body.quoting}
            onClick={onSubmit}
          >
            {submitting ? (
              <>
                <Spinner className="mr-2" />
                Registering…
              </>
            ) : (
              submitLabel(body.quote)
            )}
          </Button>

          {isGuest && <RecaptchaNotice />}
        </>
      )}
    </aside>
  );
}
