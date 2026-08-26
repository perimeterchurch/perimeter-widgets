import * as React from 'react';
import { FullBleed } from './FullBleed';

/**
 * Full-bleed horizontal scroller of trip photography, sitting directly under
 * the heading band.
 *
 * **Where the images come from.** Ministry Platform has no gallery for a
 * campaign today, so this is fed by `data-gallery-urls` and falls back to the
 * destination banner (`Journey_Destinations.Website_Banner`) — which is the
 * photo the old hero used, so a trip with nothing configured still shows its
 * one real image rather than an empty band.
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

  const visible = images.filter((src) => !failed.has(src));
  if (visible.length === 0) return null;

  const markFailed = (src: string) =>
    setFailed((prev) => {
      const next = new Set(prev);
      next.add(src);
      return next;
    });

  return (
    <FullBleed enabled={fullBleed}>
      {/*
        A scroll container must be reachable without a mouse, so it is a
        labelled region with a tab stop — that is what lets a keyboard user
        arrow through the photos. Without tabIndex the overflow is simply
        unreachable for them.
      */}
      <ul
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-2.5 focus-visible:outline-2 focus-visible:outline-ring"
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
    </FullBleed>
  );
}
