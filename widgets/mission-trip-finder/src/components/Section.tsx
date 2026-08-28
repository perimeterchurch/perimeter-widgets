import * as React from 'react';
import { cn } from '@perimeter/ui/utils/cn';

/**
 * One band of the detail page.
 *
 * The vertical rhythm is uniform: every band carries the same padding above and
 * below, so adjacent bands are always separated by the same amount, and the
 * gap between a band's own children is the same everywhere too. The only
 * deliberate exceptions are the photo scroller, which is edge-to-edge with no
 * vertical padding at all, and the heading cluster, whose three lines are one
 * unit rather than three sections.
 *
 * Padding steps down on narrow embeds — 120px of dead space above and below
 * every band is generous on a 1400px page and absurd in a 360px column.
 */
export const SECTION_Y = 'py-16 @md:py-24 @xl:py-30';

/** Gap between a band's own children (heading, body, buttons). */
export const SECTION_GAP = 'gap-10 @md:gap-16';

/** The body measure — the Figma's 663px, rounded to the nearest scale step. */
export const READING_COLUMN = 'mx-auto w-full max-w-2xl';

export function Section({
  className,
  innerClassName,
  children,
}: {
  /** Applied to the band itself — backgrounds, padding overrides. */
  className?: string | undefined;
  /** Applied to the centred column. Alignment and gap overrides go here. */
  innerClassName?: string | undefined;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className={cn(SECTION_Y, 'px-6', className)}>
      {/* The gap lives on this flex container, not on the <section> — a gap
          utility on a non-flex parent silently does nothing, which is exactly
          how the About band ended up with its heading, body and buttons all
          touching. */}
      <div
        className={cn(
          'mx-auto flex w-full max-w-4xl flex-col items-center',
          SECTION_GAP,
          innerClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** The serif band heading — "About the Journey", "Hear From Others". */
export function SectionHeading({
  className,
  children,
}: {
  className?: string | undefined;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <h3
      className={cn(
        'text-center font-serif text-3xl leading-tight font-bold text-balance @md:text-4xl @xl:text-5xl',
        className,
      )}
    >
      {children}
    </h3>
  );
}
