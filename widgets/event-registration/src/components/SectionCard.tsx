import * as React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { QuotedRegistration, RegistrationSection } from '@perimeter/api-hooks';
import { Badge } from '@perimeter/ui/badge';
import { Button } from '@perimeter/ui/button';
import { RichText } from './RichText';
import type { DraftRegistration } from '../lib/draft';
import { formatDeadline, formatEventRange, formatMoney, formatPrice } from '../lib/format';

export interface SectionCardProps {
  section: RegistrationSection;
  timeZone: string;
  registrations: DraftRegistration[];
  quotedByLocalId: ReadonlyMap<string, QuotedRegistration>;
  /** Whether "add" is available at all (signed in, or guest allowed and nothing added yet). */
  canAdd: boolean;
  /** The editor for this section, when open. */
  editor: React.ReactNode;
  onAdd: () => void;
  onEdit: (localId: string) => void;
  onRemove: (localId: string) => void;
}

function closedReasonText(section: RegistrationSection, timeZone: string): string {
  switch (section.closedReason) {
    case 'cancelled':
      return 'This event has been cancelled.';
    case 'not_yet_open':
      return section.event.registrationStart
        ? `Registration opens ${formatDeadline(section.event.registrationStart, timeZone)}.`
        : 'Registration has not opened yet.';
    case 'closed':
      return section.event.registrationEnd
        ? `Registration closed ${formatDeadline(section.event.registrationEnd, timeZone)}.`
        : 'Registration has closed.';
    case 'full':
      return 'This event is full.';
    case 'required_options_exhausted':
      return 'Every option for this event is sold out.';
    case 'file_upload_required':
      return 'This event requires a file upload, which this page does not support.';
    case 'external_url':
      return 'Registration for this event happens on another page.';
    case 'no_product':
    case 'not_active':
    case 'not_approved':
    default:
      return 'Registration is not available for this event right now.';
  }
}

/**
 * One registration section — the parent event or one `bp_Related_Events`
 * row. With an `Enable_Label` it starts collapsed behind that prompt (the
 * native "Do you want to register anyone for…?" opt-in); otherwise it opens
 * expanded. Lists the people added so far with edit/remove, and the add
 * button labelled by `Button_Text`.
 */
export function SectionCard({
  section,
  timeZone,
  registrations,
  quotedByLocalId,
  canAdd,
  editor,
  onAdd,
  onEdit,
  onRemove,
}: SectionCardProps): React.JSX.Element {
  const [enabled, setEnabled] = React.useState(
    section.enableLabelHtml === null || registrations.length > 0,
  );
  React.useEffect(() => {
    if (registrations.length > 0) setEnabled(true);
  }, [registrations.length]);

  const remaining = section.event.remaining;
  const showEventLine = !section.isParentEvent;

  return (
    <section
      className="grid gap-4 border border-border bg-bg p-4 @md:p-6"
      aria-labelledby={`section-${section.key}-title`}
    >
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id={`section-${section.key}-title`} className="font-sans text-xl font-bold text-fg">
            {section.displayName}
          </h3>
          {section.product && (
            <Badge variant="outline">{formatPrice(section.product.basePrice)}</Badge>
          )}
          {section.event.minorRegistration && <Badge variant="secondary">Children</Badge>}
          {section.open && remaining !== null && (
            <Badge variant={remaining <= 3 ? 'warning' : 'outline'}>
              {remaining} {remaining === 1 ? 'spot' : 'spots'} left
            </Badge>
          )}
          {!section.open && <Badge variant="destructive">Closed</Badge>}
        </div>
        {showEventLine && (
          <p className="font-sans text-sm text-muted-fg">
            {section.event.title} ·{' '}
            {formatEventRange(section.event.startDate, section.event.endDate, timeZone)}
          </p>
        )}
      </div>

      {!section.open ? (
        <p className="font-sans text-sm text-muted-fg">{closedReasonText(section, timeZone)}</p>
      ) : !enabled ? (
        <label className="inline-flex cursor-pointer items-start gap-3 font-sans text-base text-fg select-none">
          <input
            type="checkbox"
            checked={false}
            onChange={() => setEnabled(true)}
            className="mt-1 size-4 shrink-0 cursor-pointer accent-primary"
          />
          <RichText html={section.enableLabelHtml} />
        </label>
      ) : (
        <>
          <RichText html={section.instructionsHtml} className="text-sm" />
          <RichText
            html={section.event.meetingInstructionsHtml}
            className="text-sm text-muted-fg"
          />

          {registrations.length > 0 && (
            <ul className="grid gap-2">
              {registrations.map((r) => {
                const quoted = quotedByLocalId.get(r.localId);
                return (
                  <li
                    key={r.localId}
                    className="flex flex-wrap items-center justify-between gap-2 border border-border bg-muted/40 px-3 py-2"
                  >
                    <div className="grid gap-0.5">
                      <span className="font-sans text-sm font-medium text-fg">
                        {r.attendeeLabel}
                      </span>
                      {quoted?.optionsSummary && (
                        <span className="font-sans text-xs text-muted-fg">
                          {quoted.optionsSummary.split('<BR>').join(' · ')}
                        </span>
                      )}
                      {quoted && quoted.overlapsWithRegistrationIndexes.length > 0 && (
                        <span className="font-sans text-xs text-warning-fg">
                          Also registered for another session at the same time.
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {quoted && (
                        <span className="font-sans text-sm text-fg">
                          {formatMoney(quoted.subtotal)}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${r.attendeeLabel}`}
                        onClick={() => onEdit(r.localId)}
                      >
                        <Pencil aria-hidden className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${r.attendeeLabel}`}
                        onClick={() => onRemove(r.localId)}
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {editor}

          {!editor && canAdd && (
            <div>
              <Button type="button" variant="secondary" size="lg" onClick={onAdd}>
                {section.buttonText}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
