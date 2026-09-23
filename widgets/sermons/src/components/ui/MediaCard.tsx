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
  viewMode: 'grid' | 'list' | 'large' | 'row';
}

// Grid / large cards are plain containers, not one big button: the image and
// title open the sermon, and the meta slots can hold their own links (series,
// speaker), which a button could not contain.
const CARD_BASE = 'overflow-hidden text-left border border-border bg-bg text-fg';

/**
 * `onClick` makes the image a mouse shortcut to the card's title button, which
 * stays the one keyboard / screen-reader target, so the image adds no second
 * tab stop.
 */
function FallbackImage({
  src,
  alt,
  className,
  onClick,
}: {
  src: string;
  alt: string;
  className?: string | undefined;
  onClick?: (() => void) | undefined;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const clickable = onClick && 'cursor-pointer';

  if (failed) {
    return <ImagePlaceholder className={cn(className, clickable)} onClick={onClick} />;
  }

  return (
    <div className={cn('relative overflow-hidden', className, clickable)} onClick={onClick}>
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

/** The card's title as its primary action: opens the sermon / series. */
function CardTitle({
  title,
  onClick,
  className,
  clamp,
}: {
  title: string;
  onClick: () => void;
  className: string;
  clamp: string;
}) {
  return (
    <h3 className={className}>
      <button
        type="button"
        onClick={onClick}
        className="group block w-full cursor-pointer text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <span className={cn('group-hover:underline', clamp)}>{title}</span>
      </button>
    </h3>
  );
}

/** The bold date · speaker line shared by the cards, the roomy row and the detail header. */
export function DateSpeakerLine({
  date,
  speaker,
  className,
}: {
  date: ReactNode;
  speaker: ReactNode;
  className: string;
}) {
  if (!date && !speaker) return null;
  return (
    <div className={cn('flex min-w-0 items-center gap-2 text-sm text-muted-fg', className)}>
      {date && <span className="shrink-0 font-semibold">{date}</span>}
      {date && speaker && <span aria-hidden="true">·</span>}
      {speaker && <span className="min-w-0 truncate">{speaker}</span>}
    </div>
  );
}

/** Renders either four-corner layout or fallback to subtitle/meta/badges */
function InfoSection({
  title,
  onClick,
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
  | 'onClick'
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
    // Title leads, then the series, then date · speaker on one line, then the
    // description; the book is pinned to the bottom so it lines up across a
    // grid row. `topLeft` = date, `topRight` = series,
    // `bottomLeft` = speaker, `bottomRight` = book.
    return (
      <div className="flex flex-1 flex-col px-4">
        <div className="flex flex-col py-4">
          <CardTitle
            title={title}
            onClick={onClick}
            className="font-serif text-[26px] font-normal leading-tight"
            clamp="line-clamp-3"
          />
          {topRight && <div className="mt-1 truncate text-sm text-muted-fg">{topRight}</div>}
          <DateSpeakerLine date={topLeft} speaker={bottomLeft} className="mt-1.5" />
          {description && (
            <p className="mt-3 text-base leading-normal text-muted-fg line-clamp-3">
              {description}
            </p>
          )}
        </div>
        {bottomRight && <div className="mt-auto pb-4 text-sm text-muted-fg">{bottomRight}</div>}
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
    onClick,
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

  if (viewMode === 'row') {
    // A roomier list row (the sermon detail's "More from this series"): the
    // grid card's serif title and date · speaker line beside a thumbnail. The
    // series (topRight) and book (bottomRight) are left out — every row here
    // shares the series.
    return (
      <article className="flex items-start gap-4 py-4 text-left text-fg">
        <FallbackImage
          key={imageUrl}
          src={imageUrl}
          alt={imageAlt}
          className="aspect-video w-28 shrink-0 @[30rem]:w-40"
          onClick={onClick}
        />
        <div className="min-w-0 flex-1">
          <CardTitle
            title={title}
            onClick={onClick}
            className="font-serif text-xl font-normal leading-tight"
            clamp="line-clamp-2"
          />
          <DateSpeakerLine date={topLeft} speaker={bottomLeft} className="mt-1" />
          {description && (
            <p className="mt-1.5 text-sm leading-normal text-muted-fg line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </article>
    );
  }

  if (viewMode === 'large') {
    return (
      <article className={cn('flex w-full flex-row', CARD_BASE)}>
        <FallbackImage
          key={imageUrl}
          src={imageUrl}
          alt={imageAlt}
          className="aspect-video w-32 shrink-0 @[30rem]:w-56"
          onClick={onClick}
        />
        <div className={cn('flex flex-1 flex-col', !hasCornersLayout && 'gap-1 p-4')}>
          {!hasCornersLayout && (
            <CardTitle
              title={title}
              onClick={onClick}
              className="font-medium text-sm leading-snug"
              clamp="line-clamp-2"
            />
          )}
          <InfoSection {...infoProps} />
        </div>
      </article>
    );
  }

  // Grid view (default)
  return (
    <article className={cn('flex flex-col', CARD_BASE)}>
      <FallbackImage
        key={imageUrl}
        src={imageUrl}
        alt={imageAlt}
        className="aspect-video w-full"
        onClick={onClick}
      />
      <div className={cn('flex flex-1 flex-col', !hasCornersLayout && 'gap-1 p-3')}>
        {!hasCornersLayout && (
          <CardTitle
            title={title}
            onClick={onClick}
            className="font-medium text-sm leading-snug"
            clamp="line-clamp-2"
          />
        )}
        <InfoSection {...infoProps} />
      </div>
    </article>
  );
}
