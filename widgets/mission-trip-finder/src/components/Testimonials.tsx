import * as React from 'react';
import { FullBleed } from './FullBleed';
import { SECTION_Y, SectionHeading } from './Section';
import { initials, type Testimonial } from '../lib/testimonials';

/**
 * The "Hear From Others" band: quotes on the brand navy surface.
 *
 * Three across on a wide embed, stacking below that. The Figma shows a
 * Figma-presentation pager ("2 / 5") over this section — that is the prototype's
 * own frame counter, not a carousel control, so this renders every testimonial
 * rather than paging them.
 */
export function Testimonials({
  testimonials,
  fullBleed,
}: {
  testimonials: readonly Testimonial[];
  fullBleed: boolean;
}): React.JSX.Element | null {
  if (testimonials.length === 0) return null;

  return (
    <FullBleed enabled={fullBleed} className="bg-surface-dark text-surface-dark-fg">
      <div className={`${SECTION_Y} px-6`}>
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12">
          <SectionHeading>Hear From Others</SectionHeading>

          <ul className="grid w-full gap-10 @2xl:grid-cols-3">
            {testimonials.map((t) => (
              <li key={t.name} className="flex flex-col gap-6">
                <blockquote className="font-sans text-lg leading-[1.9] font-medium">
                  “{t.quote}”
                </blockquote>
                <div className="flex items-center gap-5">
                  {/*
                    A monogram, not a headshot. These quotes are placeholder
                    copy with placeholder names, and inventing faces to go with
                    invented people would be worse than initials. A real source
                    can swap this for a photo without touching the layout.
                  */}
                  <span
                    aria-hidden="true"
                    className="flex size-[60px] shrink-0 items-center justify-center rounded-full bg-surface-dark-fg/15 font-sans text-lg font-bold"
                  >
                    {initials(t.name)}
                  </span>
                  <cite className="font-sans text-lg font-bold not-italic">{t.name}</cite>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </FullBleed>
  );
}
