import * as React from 'react';
import { useSermons } from '@perimeter/api-hooks';
import { Skeleton } from '@perimeter/ui/skeleton';
import { Button } from '@perimeter/ui/button';
import { cn } from '@perimeter/ui/utils/cn';
import type { LatestSermonConfig } from './types';
import { seriesImageUrl, sermonDetailsUrl, formatDate } from './lib/format';

export interface AppProps {
  config: LatestSermonConfig;
}

// Mobile (stacked): a 16:9 banner. Two-column (@md+): drop the fixed aspect and
// fill the column height so the image covers its side instead of shrinking into
// a small floating box. Grid `items-stretch` (the default, with items-center
// removed) gives the cell the content column's height for the image to cover.
const IMAGE_BOX = 'w-full overflow-hidden rounded-none aspect-video @md:aspect-auto @md:h-full';

/**
 * Sermon artwork with a loading skeleton and a graceful fallback when the
 * image endpoint 404s (no default image for the record). Mirrors the
 * FallbackImage pattern in the sermons widget's MediaCard.
 */
function SermonImage({ src, alt }: { src: string; alt: string }): React.JSX.Element {
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  if (failed) {
    return (
      <div
        className={cn('flex items-center justify-center bg-muted text-muted-fg', IMAGE_BOX)}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-2/5 w-2/5 max-h-16 max-w-16 opacity-40"
        >
          <path d="M12 3v18" />
          <path d="M7 8h10" />
          <path d="M6 21h12" />
          <path d="M9 21v-7a3 3 0 0 1 6 0v7" />
        </svg>
      </div>
    );
  }

  return (
    <div className={cn('relative', IMAGE_BOX)}>
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

function PlayIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function LoadingState(): React.JSX.Element {
  return (
    <div className="grid gap-6 @md:grid-cols-2">
      <div className="grid content-center gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className={cn(IMAGE_BOX, 'min-h-40')} />
    </div>
  );
}

function MessageState({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-lg bg-muted p-6 text-center text-sm text-muted-fg">
      {children}
    </div>
  );
}

export function App({ config }: AppProps): React.JSX.Element {
  const sermonsQuery = useSermons({
    perPage: 1,
    sort: 'date',
    order: 'desc',
    ...(config.seriesTypeId ? { seriesTypeId: config.seriesTypeId } : {}),
    ...(config.seriesId ? { seriesId: config.seriesId } : {}),
    ...(config.speakerId ? { speakerId: config.speakerId } : {}),
  });

  const sermon = sermonsQuery.data?.data.sermons[0];

  if (sermonsQuery.isLoading) {
    return (
      <div className="@container p-4">
        <LoadingState />
      </div>
    );
  }

  if (sermonsQuery.isError) {
    return (
      <div className="@container p-4">
        <MessageState>Unable to load the latest sermon. Please try again later.</MessageState>
      </div>
    );
  }

  if (!sermon) {
    return (
      <div className="@container p-4">
        <MessageState>No sermons available yet.</MessageState>
      </div>
    );
  }

  return (
    <div className="@container p-4 text-fg">
      <div className="grid gap-6 @md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2 @md:justify-center">
          {config.showDate && (
            <p className="font-sans text-sm text-muted-fg">{formatDate(sermon.date)}</p>
          )}
          <h2 className="font-serif text-4xl leading-[1.1] text-balance break-words @md:text-5xl @xl:text-6xl">
            {sermon.title}
          </h2>
          {config.showSeries && sermon.series?.title && (
            <p className="font-sans text-sm text-muted-fg">{sermon.series.title}</p>
          )}
          {config.showPlayButton && (
            <div className="mt-3">
              <Button
                size="lg"
                nativeButton={false}
                className="gap-2 rounded-none text-white"
                render={<a href={sermonDetailsUrl(sermon.id, config.detailsUrl)} />}
              >
                <PlayIcon />
                {config.playLabel}
              </Button>
            </div>
          )}
        </div>

        {config.showImage && sermon.series?.id && (
          <SermonImage src={seriesImageUrl(sermon.series.id, config.apiUrl)} alt={sermon.title} />
        )}
      </div>
    </div>
  );
}
