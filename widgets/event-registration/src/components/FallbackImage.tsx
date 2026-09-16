import * as React from 'react';
import { Skeleton } from '@perimeter/ui/skeleton';

export interface FallbackImageProps {
  /** Tried in order; the first one that loads wins. Falsy entries are skipped. */
  sources: ReadonlyArray<string | null | undefined>;
  alt: string;
  /** Classes for the box that keeps the layout while the image loads. */
  className?: string;
  imgClassName?: string;
  /** Every source failed: the caller usually switches to a no-image layout. */
  onExhausted?: () => void;
}

/**
 * An image with a fallback chain: section image → hub event image → the
 * host's default image. Shows a skeleton until the first byte paints so the
 * card does not jump, and renders nothing (telling the caller) once every
 * source has errored.
 */
export function FallbackImage({
  sources,
  alt,
  className = '',
  imgClassName = '',
  onExhausted,
}: FallbackImageProps): React.JSX.Element | null {
  const list = React.useMemo(
    () => [...new Set(sources.filter((s): s is string => !!s && s.length > 0))],
    [sources],
  );
  const [index, setIndex] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);
  const exhausted = index >= list.length;
  const reported = React.useRef(false);

  React.useEffect(() => {
    if (exhausted && !reported.current) {
      reported.current = true;
      onExhausted?.();
    }
  }, [exhausted, onExhausted]);

  if (exhausted) return null;

  return (
    <div className={`relative overflow-hidden bg-muted ${className}`}>
      {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
      <img
        src={list[index]}
        alt={alt}
        className={`block h-full w-full object-cover ${loaded ? '' : 'opacity-0'} ${imgClassName}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(false);
          setIndex((i) => i + 1);
        }}
      />
    </div>
  );
}
