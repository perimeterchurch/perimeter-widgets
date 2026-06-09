import { useState, type ReactNode } from 'react';
import { cn } from '@perimeter/ui/utils/cn';
import { Skeleton } from '@perimeter/ui/skeleton';
import { ImagePlaceholder } from './ImagePlaceholder';

interface MediaCardProps {
  imageUrl: string;
  imageAlt: string;
  title: string;
  subtitle?: string | null | undefined;
  meta?: ReactNode | undefined;
  badges?: ReactNode | undefined;
  description?: string | null | undefined;
  /** Four-corner layout for info below title (overrides subtitle/meta/badges) */
  topLeft?: ReactNode | undefined;
  topRight?: ReactNode | undefined;
  bottomLeft?: ReactNode | undefined;
  bottomRight?: ReactNode | undefined;
  onClick: () => void;
  viewMode: 'grid' | 'list' | 'large';
}

const CARD_BASE =
  'overflow-hidden rounded-xl p-0 text-left ring-1 ring-fg/10 bg-bg text-fg cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:ring-fg/20 hover:shadow-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/50';

function FallbackImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string | undefined;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <ImagePlaceholder className={className} />;
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {!loaded && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
      <img
        src={src}
        alt={alt}
        className={cn(
          'block h-full w-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function CardButton({
  onClick,
  className,
  children,
}: {
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

/** Renders either four-corner layout or fallback to subtitle/meta/badges */
function InfoSection({
  title,
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  subtitle,
  meta,
  badges,
  description,
}: Pick<
  MediaCardProps,
  | 'title'
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight'
  | 'subtitle'
  | 'meta'
  | 'badges'
  | 'description'
>) {
  const hasCornersLayout = topLeft || topRight || bottomLeft || bottomRight;

  if (hasCornersLayout) {
    // Coherent scan order: title first, then a single meta row
    // (date · speaker · book), then the series pill pinned to the bottom.
    // `topLeft` = date, `bottomLeft` = speaker, `bottomRight` = book,
    // `topRight` = series pill.
    const metaItems = [topLeft, bottomLeft, bottomRight].filter(Boolean);
    return (
      <div className="flex flex-1 flex-col gap-1.5">
        <p className="font-medium text-sm leading-snug line-clamp-2">{title}</p>
        {metaItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-fg">
            {metaItems.map((item, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true">·</span>}
                {item}
              </span>
            ))}
          </div>
        )}
        {description && <p className="text-xs text-muted-fg line-clamp-2">{description}</p>}
        {topRight && <div className="mt-auto pt-0.5">{topRight}</div>}
      </div>
    );
  }

  return (
    <>
      {subtitle && <p className="text-xs text-muted-fg">{subtitle}</p>}
      {description && <p className="text-xs text-muted-fg line-clamp-2">{description}</p>}
      {meta}
      {badges}
    </>
  );
}

export function MediaCard({
  imageUrl,
  imageAlt,
  title,
  subtitle,
  meta,
  badges,
  description,
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  onClick,
  viewMode,
}: MediaCardProps) {
  const infoProps = {
    title,
    topLeft,
    topRight,
    bottomLeft,
    bottomRight,
    subtitle,
    meta,
    badges,
    description,
  };

  const hasCornersLayout = topLeft || topRight || bottomLeft || bottomRight;
  // Compact list keeps only date (topLeft) + speaker (bottomLeft).
  const compactMeta = [topLeft, bottomLeft].filter(Boolean);

  if (viewMode === 'list') {
    return (
      <CardButton
        onClick={onClick}
        className="flex w-full items-center gap-3 px-1 py-2 text-left cursor-pointer border-b border-border last:border-b-0 transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <FallbackImage
          key={imageUrl}
          src={imageUrl}
          alt={imageAlt}
          className="h-10 w-10 shrink-0 rounded-sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{title}</p>
          <div className="flex min-w-0 items-center gap-x-2 text-xs text-muted-fg">
            {/* Compact list trims to the two most scannable slots
                (date · speaker) with a separator so they don't run together;
                the series pill (topRight) and book (bottomRight) are dropped
                to keep the single line legible. */}
            {compactMeta.map((item, i) => (
              <span key={i} className="flex min-w-0 items-center gap-2">
                {i > 0 && <span aria-hidden="true">·</span>}
                {item}
              </span>
            ))}
            {!hasCornersLayout && subtitle && <span className="truncate">{subtitle}</span>}
          </div>
        </div>
      </CardButton>
    );
  }

  if (viewMode === 'large') {
    return (
      <CardButton onClick={onClick} className={cn('flex w-full flex-row', CARD_BASE)}>
        <FallbackImage
          key={imageUrl}
          src={imageUrl}
          alt={imageAlt}
          className="aspect-video w-32 shrink-0 @[30rem]:w-56"
        />
        <div className="flex flex-1 flex-col gap-1 p-4">
          {!hasCornersLayout && (
            <p className="font-medium text-sm leading-snug line-clamp-2">{title}</p>
          )}
          <InfoSection {...infoProps} />
        </div>
      </CardButton>
    );
  }

  // Grid view (default)
  return (
    <CardButton onClick={onClick} className={cn('flex flex-col', CARD_BASE)}>
      <FallbackImage key={imageUrl} src={imageUrl} alt={imageAlt} className="aspect-video w-full" />
      <div className="flex flex-1 flex-col gap-1 p-3">
        {!hasCornersLayout && (
          <p className="font-medium text-sm leading-snug line-clamp-2">{title}</p>
        )}
        <InfoSection {...infoProps} />
      </div>
    </CardButton>
  );
}
