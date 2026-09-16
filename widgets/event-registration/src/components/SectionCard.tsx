import * as React from 'react';
import { ChevronRight, Pencil, Trash2 } from 'lucide-react';
import type { QuotedRegistration, RegistrationSection } from '@perimeter/api-hooks';
import { Badge } from '@perimeter/ui/badge';
import { Button } from '@perimeter/ui/button';
import { ExpandableText } from './ExpandableText';
import { FallbackImage } from './FallbackImage';
import { RichText } from './RichText';
import type { DraftRegistration } from '../lib/draft';
import {
  formatAgeRange,
  formatDeadline,
  formatEventRange,
  formatGradeRange,
  formatMoney,
  formatMoneyParts,
  htmlToText,
} from '../lib/format';

export interface SectionCardProps {
  section: RegistrationSection;
  timeZone: string;
  registrations: DraftRegistration[];
  quotedByLocalId: ReadonlyMap<string, QuotedRegistration>;
  /** False on an all-free event: no price block, no per-person amount. */
  showPrices: boolean;
  /** Whether "add" is available at all (signed in, or guest allowed and nothing added yet). */
  canAdd: boolean;
  /** Section image → hub image → host default; the card goes image-less once all fail. */
  imageSources: ReadonlyArray<string | null | undefined>;
  /** The inline editor for this section (desktop); null on phones, where the sheet takes over. */
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
 * row — as a tappable, image-led card: picture, badges, title, a one-line
 * summary behind "View details", the people added so far, and a footer with
 * the price and the section's `Button_Text`. The whole card is the control:
 * the footer label is a real button whose hit area is stretched over the
 * card, so selecting the event needs no separate "Add" button. The native
 * widget's `Enable_Label` opt-in question is not rendered — tapping the card
 * is the opt-in.
 */
export function SectionCard({
  section,
  timeZone,
  registrations,
  quotedByLocalId,
  showPrices,
  canAdd,
  imageSources,
  editor,
  onAdd,
  onEdit,
  onRemove,
}: SectionCardProps): React.JSX.Element {
  const [noImage, setNoImage] = React.useState(
    () => !imageSources.some((s) => !!s && s.length > 0),
  );
  const markNoImage = React.useCallback(() => setNoImage(true), []);

  const remaining = section.event.remaining;
  const showEventLine = !section.isParentEvent;
  const ageRange = formatAgeRange(section.audience.minAge, section.audience.maxAge);
  const gradeRange = formatGradeRange(section.audience.minGrade, section.audience.maxGrade);
  const summary =
    htmlToText(section.instructionsHtml) || htmlToText(section.event.meetingInstructionsHtml);
  const price = section.product ? formatMoneyParts(section.product.basePrice) : null;
  const tappable = section.open && canAdd && !editor;

  // The picture always sits on top: event banners are landscape, and a side
  // column at tablet widths cropped them to a tall sliver.
  const withImage = !noImage;
  // Anything interactive inside the card sits above the stretched add button.
  const above = 'relative z-10';

  return (
    <section
      className={`relative grid border bg-bg transition-colors ${
        noImage ? 'border-border border-l-4 border-l-secondary' : 'border-border'
      } ${
        tappable
          ? 'hover:border-secondary hover:shadow-sm has-[button[data-stretched]:focus-visible]:ring-2 has-[button[data-stretched]:focus-visible]:ring-ring has-[button[data-stretched]:active]:bg-muted/40'
          : ''
      }`}
      aria-labelledby={`section-${section.key}-title`}
      data-slot={noImage ? 'section-card-noimage' : 'section-card'}
      data-tappable={tappable ? 'true' : undefined}
    >
      {withImage && (
        <FallbackImage
          sources={imageSources}
          alt=""
          className={`aspect-video w-full ${section.open ? '' : 'opacity-60'}`}
          onExhausted={markNoImage}
        />
      )}

      <div className="grid gap-3 p-4">
        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {section.audience.adultsOnly ? (
              <Badge variant="secondary" className="rounded-none">
                Adults
              </Badge>
            ) : section.audience.minorsOnly ? (
              <Badge variant="secondary" className="rounded-none">
                Children
              </Badge>
            ) : null}
            {!section.audience.adultsOnly && ageRange && (
              <Badge variant="outline" className="rounded-none">
                {ageRange}
              </Badge>
            )}
            {gradeRange && (
              <Badge variant="outline" className="rounded-none">
                {gradeRange}
              </Badge>
            )}
            {section.open && remaining !== null && (
              <Badge variant={remaining <= 3 ? 'warning' : 'outline'} className="rounded-none">
                {remaining} {remaining === 1 ? 'spot' : 'spots'} left
              </Badge>
            )}
            {!section.open && (
              <Badge variant="destructive" className="rounded-none">
                Closed
              </Badge>
            )}
          </div>
          <h3
            id={`section-${section.key}-title`}
            className="font-sans text-lg leading-tight font-bold text-fg"
          >
            {section.displayName}
          </h3>
          {showEventLine && (
            <p className="font-sans text-sm text-muted-fg">
              {section.event.title} ·{' '}
              {formatEventRange(section.event.startDate, section.event.endDate, timeZone)}
            </p>
          )}
        </div>

        <ExpandableText summary={summary}>
          <RichText html={section.instructionsHtml} className="text-sm" />
          <RichText
            html={section.event.meetingInstructionsHtml}
            className="mt-2 text-sm text-muted-fg"
          />
        </ExpandableText>

        {section.open && registrations.length > 0 && (
          <ul className={`grid gap-2 ${above}`}>
            {registrations.map((r) => {
              const quoted = quotedByLocalId.get(r.localId);
              return (
                <li
                  key={r.localId}
                  className="flex flex-wrap items-center justify-between gap-2 border border-border bg-muted/40 py-1 pr-1 pl-3"
                >
                  <div className="grid gap-0.5 py-1">
                    <span className="font-sans text-sm font-medium text-fg">{r.attendeeLabel}</span>
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
                  <div className="flex items-center gap-1">
                    {quoted && showPrices && (
                      <span className="mr-1 font-sans text-sm text-fg">
                        {formatMoney(quoted.subtotal)}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 @min-[768px]:size-9"
                      aria-label={`Edit ${r.attendeeLabel}`}
                      onClick={() => onEdit(r.localId)}
                    >
                      <Pencil aria-hidden className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 @min-[768px]:size-9"
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
      </div>

      {(!section.open || (showPrices && price) || tappable) && (
        <div className="border-t border-border px-4 py-3">
          {!section.open ? (
            <p className="font-sans text-sm text-muted-fg">{closedReasonText(section, timeZone)}</p>
          ) : (
            <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
              {showPrices && price ? (
                <div className="grid font-sans leading-none">
                  {section.product && section.product.basePrice > 0 ? (
                    <span className="text-2xl font-bold text-fg">
                      {price.whole}
                      <sup className="ml-0.5 align-super text-xs font-semibold">{price.cents}</sup>
                    </span>
                  ) : (
                    <span className="text-2xl font-bold text-fg">Free</span>
                  )}
                  <span className="mt-1 text-xs text-muted-fg">
                    {section.product && section.product.basePrice > 0 ? 'per person' : 'no charge'}
                  </span>
                </div>
              ) : (
                <span />
              )}
              {tappable && (
                // The visible label; its hit area is the whole card (`after:inset-0`).
                <button
                  type="button"
                  data-stretched
                  onClick={onAdd}
                  className="inline-flex min-h-11 items-center gap-1 font-sans text-sm font-semibold text-secondary outline-hidden after:absolute after:inset-0 after:cursor-pointer after:content-['']"
                >
                  {section.buttonText}
                  <ChevronRight aria-hidden className="size-5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {editor && <div className={`border-t border-border bg-muted/30 p-4 ${above}`}>{editor}</div>}
    </section>
  );
}
