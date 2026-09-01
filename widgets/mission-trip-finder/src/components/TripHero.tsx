import * as React from 'react';
import { Badge } from '@perimeter/ui/badge';
import { Skeleton } from '@perimeter/ui/skeleton';
import { cn } from '@perimeter/ui/utils/cn';
import { FullBleed } from './FullBleed';
import { GlobeIcon } from './icons';

/**
 * Full-bleed cover photo with the trip's name, destination and dates centred
 * over it — the shape the legacy `missiontripdetail.html` hero had, and the
 * alternative to `TripHeading` selected by `data-hero-style="cover"`.
 *
 * It exists because the redesign's white heading band moved the photography
 * down into the scroller, and the scroller has no photos to show yet. Until
 * Global Outreach has a gallery, this puts the one photo every trip does have
 * — the destination banner — back at the top of the page.
 *
 * The image is deliberately darkened rather than the text being given a scrim:
 * destination banners are staff-chosen photos of wildly varying brightness
 * (a night skyline, a white-walled street), and a flat overlay is the only
 * thing that keeps white type legible across all of them.
 */
export function TripHero({
  src,
  fallbackSrc,
  name,
  destination,
  dates,
  registrationFull,
  invitationOnly,
  fullBleed,
}: {
  src: string | null;
  fallbackSrc?: string | undefined;
  name: string;
  destination: string | null;
  dates: string | null;
  registrationFull: boolean;
  invitationOnly: boolean;
  fullBleed: boolean;
}): React.JSX.Element {
  const [currentSrc, setCurrentSrc] = React.useState(src ?? fallbackSrc ?? null);
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const triedFallback = React.useRef(false);

  const handleError = () => {
    if (fallbackSrc && !triedFallback.current && currentSrc !== fallbackSrc) {
      triedFallback.current = true;
      setCurrentSrc(fallbackSrc);
      setLoaded(false);
    } else {
      setFailed(true);
    }
  };

  const showImage = !failed && currentSrc !== null;

  return (
    <FullBleed
      enabled={fullBleed}
      className="relative flex min-h-[340px] w-full items-center justify-center overflow-hidden bg-neutral-900 px-6 py-16 @md:min-h-[440px] @xl:min-h-[520px]"
    >
      {showImage && (
        <>
          {!loaded && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
          <img
            src={currentSrc}
            alt=""
            aria-hidden="true"
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
              loaded ? 'opacity-100' : 'opacity-0',
            )}
            onLoad={() => setLoaded(true)}
            onError={handleError}
          />
          <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
        </>
      )}

      {!showImage && (
        <div
          className="absolute inset-0 flex items-center justify-center text-white/20"
          aria-hidden="true"
        >
          <GlobeIcon className="h-40 w-40" />
        </div>
      )}

      <div className="relative flex w-full max-w-3xl flex-col items-center gap-2 text-center text-white">
        <h2 className="font-serif text-4xl leading-[1.05] font-normal text-balance @md:text-6xl @xl:text-7xl">
          {name}
        </h2>
        {destination && (
          <p className="font-serif text-2xl leading-tight font-normal @md:text-4xl">
            {destination}
          </p>
        )}
        {dates && (
          <p className="font-sans text-lg font-bold tracking-wide text-white/90 @md:text-2xl">
            {dates}
          </p>
        )}

        {/* Carried over from TripHeading: whichever hero an embed picks, a full
            or invitation-only trip has to say so before the CTAs further down
            are read. */}
        {(registrationFull || invitationOnly) && (
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            {registrationFull && <Badge variant="warning">Registration Full</Badge>}
            {invitationOnly && <Badge variant="secondary">Invitation Only</Badge>}
          </div>
        )}
      </div>
    </FullBleed>
  );
}
