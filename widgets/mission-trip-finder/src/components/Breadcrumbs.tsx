import * as React from 'react';
import { cn } from '@perimeter/ui/utils/cn';

/**
 * One step in the trail. A crumb is a link when it can go somewhere — either
 * in-widget (`onClick`) or out to a host page (`href`) — and plain text when it
 * is the page you are already on.
 */
export interface Crumb {
  label: string;
  onClick?: (() => void) | undefined;
  href?: string | undefined;
}

/**
 * The detail view's navigation trail — "GO Journeys / Guatemala Medical
 * Missions / Samantha Morgan" — sitting directly beneath whichever hero the
 * embed renders.
 *
 * This replaced the Back button in the toolbar. Back could only ever undo one
 * step, so a visitor two levels deep (list → trip → participant) had no way to
 * see where they were or to jump straight out; the trail shows the whole path
 * and every level above the current one is clickable.
 *
 * Links are `primary`, the brand sky-blue, because that is what everything else
 * on the page uses and Global Outreach wants the trail to match. It is a FILL
 * color doing text duty: engineered to carry navy text on top of it, so as text
 * on white it measures 2.1:1 and fails WCAG AA. That is a known, accepted
 * exception, not an oversight.
 *
 * It has been measured, so the fix is ready when the ministry approves it:
 * `hsl(200.1 75.7% 36%)` (#1673a1) is the same hue and saturation at a darker
 * lightness — visually the same blue, 5.3:1 on white and 4.8:1 on `bg-muted`.
 * Swapping the two class names below is the whole change; it wants a
 * `color-link` token in `@perimeter/theme` rather than a literal, since
 * `color-primary` has to stay light for the buttons it fills.
 *
 * Meanwhile the underline on hover and focus is load-bearing rather than
 * decorative: at this contrast it is the only reliable cue that these are
 * interactive, so it stays either way.
 *
 * Rendered as `<nav><ol>` with `aria-current="page"` on the tail so it is
 * announced as a breadcrumb rather than as a run of loose links. Separators are
 * `aria-hidden` — a screen reader reading out "slash" between every level is
 * noise.
 */
export function Breadcrumbs({
  crumbs,
  className,
}: {
  crumbs: Crumb[];
  /** Spacing against whatever sits above — see `PULL_UNDER_SECTION`. */
  className?: string | undefined;
}): React.JSX.Element | null {
  // A one-item trail is not a trail. This is the pinned-embed case: a details
  // page with no list behind it and no `listUrl` configured has nowhere above
  // the trip to point at, so the bar is dropped rather than shown as a lone
  // non-clickable word.
  if (crumbs.length < 2) return null;

  // A crumb is one line. Trip names run long — "Guatemala Medical Missions
  // Worship Volunteers" wrapped to four lines in a 375px column, with the
  // separator floating beside the middle of it — so a narrow embed clips the
  // label rather than reflowing it. The full text stays in the DOM, so the
  // accessible name is never the truncated one, and the heading directly above
  // carries the trip's name in full anyway. The trail itself still wraps
  // BETWEEN crumbs, which is what a breadcrumb should do.
  const labelClass = 'block max-w-36 truncate @sm:max-w-56 @md:max-w-none';

  const linkClass =
    'text-primary underline-offset-4 hover:underline focus-visible:underline ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
    'rounded-xs ' +
    labelClass;

  return (
    <nav aria-label="Breadcrumb" className={cn('px-6 pt-5 @md:pt-6', className)}>
      <ol className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-center gap-x-2 gap-y-1 font-sans text-sm @md:text-base">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;

          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-x-2">
              {i > 0 && (
                <span aria-hidden="true" className="text-muted-fg select-none">
                  /
                </span>
              )}

              {isLast || (!crumb.onClick && !crumb.href) ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={`text-muted-fg ${labelClass}`}
                >
                  {crumb.label}
                </span>
              ) : crumb.href ? (
                <a href={crumb.href} className={linkClass}>
                  {crumb.label}
                </a>
              ) : (
                <button type="button" onClick={crumb.onClick} className={linkClass}>
                  {crumb.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
