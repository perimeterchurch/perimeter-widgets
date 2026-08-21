import * as React from 'react';
import type { StaffDirectoryMember } from '@perimeter/api-hooks';
import { cn } from '@perimeter/ui/utils/cn';
import type { StaffDirectoryConfig } from '../types';
import { contactUrl, formatMinistries, formatPositionTitles, initials } from '../lib/format';

/**
 * Portrait tile. The legacy widget clamped its photos to 250–300px tall with
 * `object-fit: cover`; a fixed 4:5 box is the responsive equivalent and keeps
 * every card in a row the same height however tall the source image is.
 */
const PHOTO_BOX = 'relative w-full overflow-hidden aspect-[4/5] bg-muted';

/**
 * Whether an `<img>` has already finished with its current `src`.
 *
 * `onError` cannot be relied on alone: a **cached** failure completes before
 * React attaches the handler, so the event never fires and the broken image
 * would sit there instead of falling back to the initials tile. `complete`
 * alone cannot tell a finished decode from a finished failure — `naturalWidth`
 * is what separates them.
 *
 * Exported for the test that pins this behaviour; jsdom never actually loads
 * images, so the states are only reachable through a plain object.
 */
export function resolveCachedImageState(img: {
  complete: boolean;
  naturalWidth: number;
}): 'loaded' | 'failed' | 'pending' {
  if (!img.complete) return 'pending';
  return img.naturalWidth > 0 ? 'loaded' : 'failed';
}

/**
 * A staff photo, or the initials tile when there is none.
 *
 * Photos come from MP's public files endpoint, and roughly two in five staff
 * have no headshot on file, so the fallback is a normal state rather than an
 * error path. `defaultPhotoUrl` is tried once before giving up, then initials
 * render with no further request.
 *
 * **There is deliberately no fade-in and no skeleton.** The obvious version of
 * this component tracked a `loaded` flag and cross-faded `opacity-0` →
 * `opacity-100`, and it broke on a real page: a full directory is ~200 photos,
 * so that produced ~200 concurrent CSS opacity transitions, and the browser left
 * every one of them `playState: "running"` at opacity 0 long past their 300ms —
 * a grid of blank tiles over fully-decoded images. The box's own `bg-muted` is
 * the placeholder instead: an opaque JPEG simply paints over it when it arrives,
 * which needs no state, no animation, and cannot get stuck.
 */
function StaffPhoto({
  src,
  fallbackSrc,
  name,
}: {
  src: string | null;
  fallbackSrc: string | undefined;
  name: string;
}): React.JSX.Element {
  const [currentSrc, setCurrentSrc] = React.useState(src ?? fallbackSrc ?? null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const triedFallback = React.useRef(false);

  const handleError = React.useCallback(() => {
    if (fallbackSrc && !triedFallback.current && currentSrc !== fallbackSrc) {
      triedFallback.current = true;
      setCurrentSrc(fallbackSrc);
      return;
    }
    setCurrentSrc(null);
  }, [currentSrc, fallbackSrc]);

  // Catch an image that had already failed before the handler existed.
  React.useLayoutEffect(() => {
    if (imgRef.current === null) return;
    if (resolveCachedImageState(imgRef.current) === 'failed') handleError();
  }, [currentSrc, handleError]);

  if (currentSrc === null) {
    return (
      <div className={cn(PHOTO_BOX, 'flex items-center justify-center')}>
        <span
          aria-hidden="true"
          className="font-serif text-5xl font-normal text-muted-fg select-none"
        >
          {initials(name)}
        </span>
      </div>
    );
  }

  return (
    <div className={PHOTO_BOX}>
      <img
        ref={imgRef}
        src={currentSrc}
        alt={name}
        loading="lazy"
        className="block h-full w-full object-cover"
        onError={handleError}
      />
    </div>
  );
}

/**
 * Name and title over the photo, on the dark scrim that makes them readable.
 *
 * The scrim is a literal black overlay rather than a theme token, and the text
 * is literal white: this is the legacy widget's design, and both sit over a
 * photograph whose colours no token can predict. It lightens on hover, which is
 * the card's only affordance — there is no button.
 */
function StaffCaption({
  name,
  titles,
  ministries,
}: {
  name: string;
  titles: string | null;
  ministries: string | null;
}): React.JSX.Element {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/50 transition-opacity duration-200 group-hover:opacity-40"
      />
      <div className="absolute inset-x-0 bottom-0 p-4 text-center">
        <h3 className="font-sans text-base leading-snug font-bold text-balance text-white">
          {name}
        </h3>
        {titles && (
          <p className="mt-1 font-sans text-sm leading-snug font-medium text-balance text-white">
            {titles}
          </p>
        )}
        {ministries && (
          <p className="mt-0.5 font-sans text-xs leading-snug font-medium text-balance text-white/80">
            {ministries}
          </p>
        )}
      </div>
    </>
  );
}

export function StaffCard({
  member,
  config,
}: {
  member: StaffDirectoryMember;
  config: StaffDirectoryConfig;
}): React.JSX.Element {
  const titles = config.showPositions ? formatPositionTitles(member.positions) || null : null;
  const ministries = config.showMinistryOnCard ? formatMinistries(member.positions) || null : null;

  const photo = (
    <StaffPhoto src={member.photoUrl} fallbackSrc={config.defaultPhotoUrl} name={member.name} />
  );
  const caption = <StaffCaption name={member.name} titles={titles} ministries={ministries} />;

  // A card links only when linking is on AND there is a GUID to link with.
  // Without one the contact page has nothing to resolve, so an anchor would
  // promise a page that 404s.
  const href = config.linkCards ? contactUrl(member, config.targetUrl) : null;

  if (href === null) {
    return (
      <li className="group relative overflow-hidden">
        {photo}
        {caption}
      </li>
    );
  }

  return (
    <li className="group relative overflow-hidden">
      <a
        href={href}
        className="block no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {photo}
        {caption}
      </a>
    </li>
  );
}
