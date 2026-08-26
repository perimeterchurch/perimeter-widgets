import * as React from 'react';
import { cn } from '@perimeter/ui/utils/cn';

/**
 * One band of the detail page: the Figma's 120px vertical rhythm, with the
 * content centred in a readable column.
 *
 * The padding steps down on narrow embeds — 120px of dead space above and
 * below every section is generous on a 1400px page and absurd in a 360px
 * column.
 */
export const SECTION_Y = 'py-16 @md:py-24 @xl:py-30';

/** The Figma's 663px body measure, rounded to the nearest scale step. */
export const READING_COLUMN = 'mx-auto w-full max-w-2xl';

export function Section({
  className,
  children,
}: {
  className?: string | undefined;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className={cn(SECTION_Y, 'px-6', className)}>
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center">{children}</div>
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
        'text-center font-serif text-3xl leading-tight font-medium text-balance @md:text-4xl @xl:text-5xl',
        className,
      )}
    >
      {children}
    </h3>
  );
}
