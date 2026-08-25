import * as React from 'react';
import { Skeleton } from '@perimeter/ui/skeleton';
import { cn } from '@perimeter/ui/utils/cn';
import { GlobeIcon } from './icons';

export const IMAGE_BOX = 'w-full overflow-hidden aspect-video bg-muted';

/**
 * Destination banner with a loading skeleton, falling back to the configured
 * default image and then to a globe placeholder. Banners are absolute URLs
 * stored on Journey_Destinations rather than something our API serves, so a
 * dead link is a content problem — the fallback chain keeps the card intact.
 */
export function TripBanner({
  src,
  fallbackSrc,
  alt,
  className,
}: {
  src: string | null;
  fallbackSrc?: string | undefined;
  alt: string;
  className?: string | undefined;
}): React.JSX.Element {
  const initialSrc = src ?? fallbackSrc ?? null;
  const [loaded, setLoaded] = React.useState(false);
  const [currentSrc, setCurrentSrc] = React.useState(initialSrc);
  const [failed, setFailed] = React.useState(false);
  const triedFallback = React.useRef(false);

  // Each banner is keyed by trip id, so this state resets per trip without
  // needing to sync against the `src` prop.
  const handleError = () => {
    if (fallbackSrc && !triedFallback.current && currentSrc !== fallbackSrc) {
      triedFallback.current = true;
      setCurrentSrc(fallbackSrc);
      setLoaded(false);
    } else {
      setFailed(true);
    }
  };

  if (failed || currentSrc === null) {
    return (
      <div
        className={cn('flex items-center justify-center text-muted-fg', IMAGE_BOX, className)}
        aria-hidden="true"
      >
        <GlobeIcon className="h-2/5 max-h-16 w-2/5 max-w-16 opacity-40" />
      </div>
    );
  }

  return (
    <div className={cn('relative', IMAGE_BOX, className)}>
      {!loaded && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
      <img
        src={currentSrc}
        alt={alt}
        loading="lazy"
        className={cn(
          'block h-full w-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
        onLoad={() => setLoaded(true)}
        onError={handleError}
      />
    </div>
  );
}
