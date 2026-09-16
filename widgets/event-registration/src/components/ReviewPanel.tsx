import * as React from 'react';
import { TriangleAlert } from 'lucide-react';
import type { RegistrationQuote } from '@perimeter/api-hooks';
import { Button } from '@perimeter/ui/button';
import { Spinner } from '@perimeter/ui/spinner';
import { formatMoney } from '../lib/format';

export interface ReviewPanelProps {
  quote: RegistrationQuote | null;
  quoting: boolean;
  quoteError: string | null;
  registrationCount: number;
  /** Any section product offers a deposit. */
  depositAvailable: boolean;
  /** False on an all-free event: no amounts and no Total row. */
  showPrices: boolean;
  payDeposit: boolean;
  onPayDepositChange: (value: boolean) => void;
  submitting: boolean;
  submitError: string | null;
  canSubmit: boolean;
  isGuest: boolean;
  onSubmit: () => void;
}

/**
 * The running total and the submit. The server's quote is authoritative:
 * lines, problems, overlap warnings and the total all come from it, and the
 * submit button stays disabled until the quote says the plan is submittable.
 */
export function ReviewPanel({
  quote,
  quoting,
  quoteError,
  registrationCount,
  depositAvailable,
  showPrices,
  payDeposit,
  onPayDepositChange,
  submitting,
  submitError,
  canSubmit,
  isGuest,
  onSubmit,
}: ReviewPanelProps): React.JSX.Element {
  const problems = quote?.problems ?? [];
  const generalProblems = problems.filter((p) => p.registrationIndex === null);
  const perRegistration = problems.filter((p) => p.registrationIndex !== null);
  const overlaps = (quote?.registrations ?? []).filter(
    (r) => r.overlapsWithRegistrationIndexes.length > 0,
  );

  return (
    <aside
      className="grid gap-4 border border-secondary bg-bg p-4 @md:p-6"
      aria-labelledby="registration-review-title"
    >
      <h3 id="registration-review-title" className="font-sans text-xl font-bold text-fg">
        Your registration
      </h3>

      {registrationCount === 0 ? (
        <p className="font-sans text-sm text-muted-fg">
          Add at least one person above to continue.
        </p>
      ) : (
        <>
          {quote && (
            <ul className="grid gap-3">
              {quote.registrations.map((r) => (
                <li key={r.registrationIndex} className="grid gap-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-sans text-sm font-medium text-fg">{r.attendeeName}</span>
                    {showPrices && (
                      <span className="font-sans text-sm text-fg">{formatMoney(r.subtotal)}</span>
                    )}
                  </div>
                  <ul className="grid gap-0.5 pl-3 font-sans text-xs text-muted-fg">
                    {r.lines.map((line, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span>
                          {line.kind === 'base'
                            ? line.title
                            : `${line.title}${line.quantity > 1 ? ` × ${line.quantity}` : ''}`}
                        </span>
                        {showPrices && <span>{formatMoney(line.lineTotal)}</span>}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}

          {overlaps.length > 0 && (
            <p className="flex items-start gap-2 font-sans text-sm text-warning-fg" role="status">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                {overlaps.map((o) => o.attendeeName).join(', ')}{' '}
                {overlaps.length === 1 ? 'is' : 'are'} registered for two sessions that happen at
                the same time. You can still continue if that is intended.
              </span>
            </p>
          )}

          {(generalProblems.length > 0 || perRegistration.length > 0) && (
            <ul role="alert" className="grid gap-1 font-sans text-sm text-destructive">
              {generalProblems.map((p, i) => (
                <li key={`g${i}`}>{p.message}</li>
              ))}
              {perRegistration.map((p, i) => {
                const who = quote?.registrations.find(
                  (r) => r.registrationIndex === p.registrationIndex,
                )?.attendeeName;
                return (
                  <li key={`r${i}`}>
                    {who ? `${who}: ` : ''}
                    {p.message}
                  </li>
                );
              })}
            </ul>
          )}

          {quoteError && (
            <p role="alert" className="font-sans text-sm text-destructive">
              {quoteError}
            </p>
          )}

          {depositAvailable && quote && quote.invoiceTotal > 0 && (
            <label
              htmlFor="review-pay-deposit"
              className="inline-flex cursor-pointer items-start gap-2 font-sans text-sm text-fg select-none"
            >
              <input
                id="review-pay-deposit"
                type="checkbox"
                checked={payDeposit}
                onChange={(e) => onPayDepositChange(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
              />
              Pay a deposit now and the balance later.
            </label>
          )}

          {showPrices ? (
            <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
              <span className="font-sans text-base font-bold text-fg">Total</span>
              <span className="font-sans text-xl font-bold text-fg">
                {quoting && !quote ? <Spinner /> : formatMoney(quote?.invoiceTotal ?? 0)}
              </span>
            </div>
          ) : (
            <div className="border-t border-border" />
          )}

          {submitError && (
            <p role="alert" className="font-sans text-sm text-destructive">
              {submitError}
            </p>
          )}

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!canSubmit || submitting || quoting}
            onClick={onSubmit}
          >
            {submitting ? (
              <>
                <Spinner className="mr-2" />
                Registering…
              </>
            ) : quote && quote.invoiceTotal > 0 ? (
              'Register and continue to payment'
            ) : (
              'Complete registration'
            )}
          </Button>

          {isGuest && (
            <p className="font-sans text-xs text-muted-fg">
              This form is protected by reCAPTCHA. Google's{' '}
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
          )}
        </>
      )}
    </aside>
  );
}
