import * as React from 'react';
import { Button } from '@perimeter/ui/button';
import { Spinner } from '@perimeter/ui/spinner';
import { RecaptchaNotice } from './ReviewPanel';

export type CtaState = 'empty' | 'needs-contact' | 'quoting' | 'blocked' | 'ready';

export interface StickyCtaProps {
  state: CtaState;
  label: string;
  /** Fires for `needs-contact` (go to the form) and `ready` (submit). */
  onPrimary: () => void;
  /** Opens the summary so the visitor can read the problems. */
  onShowProblems: () => void;
  problemCount: number;
  submitting: boolean;
  submitError: string | null;
  isGuest: boolean;
}

/**
 * The phone/tablet "Continue" bar, sticky at the bottom of the widget. It is
 * the stepper: it points at the next thing to do (add someone, fill in your
 * details, fix an issue) until the quote is submittable, then it submits.
 */
export function StickyCta({
  state,
  label,
  onPrimary,
  onShowProblems,
  problemCount,
  submitting,
  submitError,
  isGuest,
}: StickyCtaProps): React.JSX.Element {
  const disabled = state === 'empty' || state === 'quoting' || state === 'blocked' || submitting;
  return (
    <div
      data-slot="sticky-cta"
      className="sticky bottom-0 z-20 -mx-4 grid gap-2 border-t border-border bg-bg px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]"
    >
      {submitError && (
        <p role="alert" className="font-sans text-sm text-destructive">
          {submitError}
        </p>
      )}
      {state === 'blocked' && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-self-start"
          onClick={onShowProblems}
        >
          Fix {problemCount} {problemCount === 1 ? 'issue' : 'issues'} to continue
        </Button>
      )}
      <Button
        type="button"
        size="lg"
        className="min-h-12 w-full"
        disabled={disabled}
        aria-disabled={disabled}
        onClick={onPrimary}
      >
        {submitting || state === 'quoting' ? (
          <>
            <Spinner className="mr-2" />
            {submitting ? 'Registering…' : 'Checking…'}
          </>
        ) : (
          label
        )}
      </Button>
      {isGuest && state === 'ready' && <RecaptchaNotice className="text-2xs" />}
    </div>
  );
}
