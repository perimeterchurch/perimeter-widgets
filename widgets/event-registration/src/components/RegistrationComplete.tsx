import * as React from 'react';
import { CircleCheck } from 'lucide-react';
import type { RegistrationEvent, RegistrationSubmitResult } from '@perimeter/api-hooks';
import { Button } from '@perimeter/ui/button';
import { formatEventRange } from '../lib/format';

export interface RegistrationCompleteProps {
  event: RegistrationEvent;
  /** The successful submit; `dryRun` results never reach this component. */
  result: Extract<RegistrationSubmitResult, { dryRun: false }>;
  /** Where the confirmation email goes; empty when unknown. */
  contactEmail: string;
  returnUrl: string;
  onRegisterMore: () => void;
}

/**
 * The in-widget confirmation for a registration that owes nothing. A paid
 * registration goes to the native Invoice Details & Payment page; sending a
 * free one there only shows a $0 invoice, so the widget confirms in place
 * and offers to register someone else.
 */
export function RegistrationComplete({
  event,
  result,
  contactEmail,
  returnUrl,
  onRegisterMore,
}: RegistrationCompleteProps): React.JSX.Element {
  const sectionName = new Map(event.sections.map((s) => [s.key, s.displayName]));
  return (
    <section
      aria-labelledby="registration-complete-title"
      data-slot="registration-complete"
      className="grid gap-4 border border-secondary bg-bg p-4 @min-[480px]:p-6"
    >
      <div className="flex items-start gap-3">
        <CircleCheck aria-hidden className="mt-0.5 size-7 shrink-0 text-primary" />
        <div className="grid gap-1">
          <h2 id="registration-complete-title" className="font-sans text-xl font-bold text-fg">
            You&apos;re registered
          </h2>
          <p className="font-sans text-sm text-muted-fg">
            {event.title} · {formatEventRange(event.startDate, event.endDate, event.timeZone)}
          </p>
        </div>
      </div>

      <ul className="grid gap-2">
        {result.quote.registrations.map((r) => (
          <li
            key={r.registrationIndex}
            className="grid gap-0.5 border border-border bg-muted/40 px-3 py-2"
          >
            <span className="font-sans text-sm font-medium text-fg">{r.attendeeName}</span>
            <span className="font-sans text-xs text-muted-fg">
              {sectionName.get(r.sectionKey) ?? r.sectionKey}
              {r.optionsSummary ? ` · ${r.optionsSummary.split('<BR>').join(' · ')}` : ''}
            </span>
          </li>
        ))}
      </ul>

      {contactEmail.trim().length > 0 && (
        <p className="font-sans text-sm text-muted-fg">
          A confirmation will be sent to <span className="text-fg">{contactEmail}</span>.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" size="lg" onClick={onRegisterMore}>
          Register someone else
        </Button>
        <Button variant="outline" size="lg" nativeButton={false} render={<a href={returnUrl} />}>
          Back to events
        </Button>
      </div>
    </section>
  );
}
