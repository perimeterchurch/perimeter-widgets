import * as React from 'react';
import { FullBleed } from './FullBleed';
import { ChevronRightIcon } from './icons';

/**
 * Full-bleed horizontal scroller of trip photography, sitting directly under
 * the heading band.
 *
 * **Where the images come from.** Ministry Platform has no gallery for a
 * campaign today, so this is fed by `data-gallery-urls` and falls back to the
 * destination banner (`Journey_Destinations.Website_Banner`) — the one real
 * photo every trip has, so a trip with nothing configured still shows something
 * rather than an empty band.
 *
 * MP does have the right shape unwired: `Journey_Files` holds `Link` +
 * `Thumbnail_Link` per file and joins to `Journey_Contents`, but every live
 * campaign has a null `Journey_Content_ID`, so nothing reaches it. If Global
 * Outreach starts populating it, this becomes an API-backed list without the
 * component changing.
 */
export function TripGallery({
  images,
  alt,
  fullBleed,
}: {
  images: string[];
  alt: string;
  fullBleed: boolean;
}): React.JSX.Element | null {
  const [failed, setFailed] = React.useState<Set<string>>(new Set());
  const [overflows, setOverflows] = React.useState(false);
  const scrollerRef = React.useRef<HTMLUListElement>(null);

  const visible = images.filter((src) => !failed.has(src));

  // Whether there is anything hidden off the right edge. The native scrollbar
  // is hidden, so this is what decides if the chevron is shown at all — an
  // arrow that cannot move is worse than no arrow.
  React.useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const measure = () => setOverflows(el.scrollWidth > el.clientWidth + 1);
    measure();

    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [visible.length]);

  if (visible.length === 0) return null;

  const markFailed = (src: string) =>
    setFailed((prev) => {
      const next = new Set(prev);
      next.add(src);
      return next;
    });

  /**
   * Advance by exactly one tile so the scroll-snap points stay aligned, and
   * wrap to the start once the end is reached — with the scrollbar hidden and
   * only a forward control, stopping at the end would leave a mouse user with
   * no way back.
   */
  const advance = () => {
    const el = scrollerRef.current;
    if (!el) return;

    const first = el.querySelector('li');
    const gap = Number.parseFloat(getComputedStyle(el).columnGap || '0') || 0;
    const step = first ? first.getBoundingClientRect().width + gap : el.clientWidth;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth';

    if (atEnd) el.scrollTo({ left: 0, behavior });
    else el.scrollBy({ left: step, behavior });
  };

  return (
    <FullBleed enabled={fullBleed}>
      <div className="relative">
        {/*
          A scroll container must be reachable without a mouse, so it is a
          labelled region with a tab stop — that is what lets a keyboard user
          arrow through the photos. The native scrollbar is hidden (the design
          has none), which is exactly why the chevron below exists: without
          either, a mouse user has no affordance at all.
        */}
        <ul
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-2.5 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-scrollbar]:hidden"
          tabIndex={0}
          role="region"
          aria-label={`Photos from ${alt}`}
        >
          {visible.map((src) => (
            <li key={src} className="w-[260px] shrink-0 snap-start @md:w-[340px] @xl:w-[420px]">
              <img
                src={src}
                alt=""
                loading="lazy"
                // Square tiles, cropped. Banner artwork is 3:2, so without a
                // fixed box the first image would set the row height and the
                // rest would jump as they load.
                className="aspect-square w-full bg-muted object-cover"
                onError={() => markFailed(src)}
              />
            </li>
          ))}
        </ul>

        {overflows && (
          <button
            type="button"
            onClick={advance}
            aria-label="Show more photos"
            className="absolute top-1/2 right-4 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-bg text-fg shadow-lg transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </FullBleed>
  );
}
