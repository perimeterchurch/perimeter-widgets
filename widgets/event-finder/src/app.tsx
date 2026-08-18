import * as React from 'react';
import { useEvents, type EventListItem } from '@perimeter/api-hooks';
import { Button } from '@perimeter/ui/button';
import { Skeleton } from '@perimeter/ui/skeleton';
import { cn } from '@perimeter/ui/utils/cn';
import type { EventFinderConfig } from './types';
import {
  eventImageUrl,
  formatEventDate,
  formatEventDateAlt,
  htmlToText,
  truncate,
} from './lib/format';
import { PERIMETER_MARK_DATA_URI } from './lib/perimeter-mark';

export interface AppProps {
  config: EventFinderConfig;
}

const IMAGE_BOX = 'w-full overflow-hidden aspect-video bg-muted';

/**
 * Branded fallback tile shown when an event has no image (and no custom
 * `defaultImageUrl` loads): the Perimeter arch mark as a watermark on the brand
 * navy panel. Purely decorative — the wrapper is `aria-hidden` and the card's
 * title carries the accessible name, so the mark needs no alt text.
 */
function EventImagePlaceholder(): React.JSX.Element {
  return (
    <div
      className={cn(IMAGE_BOX, 'flex items-center justify-center bg-surface-dark')}
      aria-hidden="true"
    >
      <img src={PERIMETER_MARK_DATA_URI} alt="" className="w-[36%] max-w-36" />
    </div>
  );
}

/**
 * Event artwork with a loading skeleton and a graceful fallback when the image
 * endpoint 404s (the event has no default image in MP). Mirrors the
 * FallbackImage pattern in the sermons/latest-sermon widgets.
 */
function EventImage({
  src,
  fallbackSrc,
  alt,
}: {
  src: string;
  fallbackSrc?: string | undefined;
  alt: string;
}): React.JSX.Element {
  const [loaded, setLoaded] = React.useState(false);
  const [currentSrc, setCurrentSrc] = React.useState(src);
  const [failed, setFailed] = React.useState(false);
  const triedFallback = React.useRef(false);

  // On error, try the configured default image once before falling back to the
  // branded placeholder. Each card is keyed by event id, so this state resets
  // per event without needing to sync the `src` prop.
  const handleError = () => {
    if (fallbackSrc && !triedFallback.current && currentSrc !== fallbackSrc) {
      triedFallback.current = true;
      setCurrentSrc(fallbackSrc);
      setLoaded(false);
    } else {
      setFailed(true);
    }
  };

  if (failed) {
    return <EventImagePlaceholder />;
  }

  return (
    <div className={cn('relative', IMAGE_BOX)}>
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

function EventCard({
  event,
  config,
}: {
  event: EventListItem;
  config: EventFinderConfig;
}): React.JSX.Element {
  const dateText = config.altDate
    ? formatEventDateAlt(event.startDate)
    : formatEventDate(event.startDate, event.endDate);

  return (
    <li className="flex flex-col overflow-hidden rounded-none border border-border bg-bg text-fg shadow-xs transition-shadow hover:shadow-md">
      {config.showImages && (
        <EventImage
          src={eventImageUrl(event.id, config.apiUrl)}
          fallbackSrc={config.defaultImageUrl}
          alt={event.title}
        />
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-sans text-xl leading-snug font-bold text-balance">{event.title}</h3>
        <p className="font-sans text-sm font-medium text-muted-fg">{dateText}</p>
        {config.showLocation && event.location && (
          <p className="font-sans text-sm text-muted-fg">{event.location}</p>
        )}

        {config.showDescription && event.description && (
          // MP stores the description as HTML; render a plain-text opening
          // clipped to descriptionLimit (matches the group-finder card).
          <p className="mt-1 font-sans text-sm leading-relaxed">
            {truncate(htmlToText(event.description), config.descriptionLimit)}
          </p>
        )}

        {config.showDetails && event.detailsUrl && (
          <div className="mt-auto flex justify-end pt-3">
            <Button
              size="sm"
              nativeButton={false}
              className="rounded-none text-white"
              render={<a href={event.detailsUrl} />}
            >
              {config.detailsLabel}
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

const GRID = 'grid grid-cols-1 gap-4 @md:grid-cols-2 @2xl:grid-cols-3';

function LoadingState(): React.JSX.Element {
  return (
    <ul className={GRID}>
      {Array.from({ length: 3 }, (_, i) => (
        <li
          key={i}
          className="flex flex-col gap-2 overflow-hidden rounded-none border border-border p-4"
        >
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </li>
      ))}
    </ul>
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
  const hasList = config.listId.trim().length > 0;
  const query = useEvents(
    {
      listId: config.listId,
      ...(config.includePast ? { includePast: 'true' } : {}),
      // Default (on) shows every occurrence; only send the flag to collapse.
      ...(config.showFullSeries ? {} : { showFullSeries: 'false' as const }),
      ...(config.featured ? { featured: 'true' } : {}),
      ...(config.congregationId ? { congregationId: config.congregationId } : {}),
      ...(config.programId ? { programId: config.programId } : {}),
      ...(config.tierId ? { tierId: config.tierId } : {}),
      ...(config.signupType ? { signupType: config.signupType } : {}),
      ...(config.month ? { month: config.month } : {}),
      ...(config.keyword ? { keyword: config.keyword } : {}),
      ...(config.maxEvents ? { maxEvents: config.maxEvents } : {}),
      // No pagination UI: request the max page size and let maxEvents (if set)
      // cap the total server-side.
      perPage: 100,
    },
    { enabled: hasList },
  );

  const events = query.data?.data.events ?? [];

  return (
    <div className="@container p-4 text-left">
      {!hasList ? (
        <MessageState>No event list configured.</MessageState>
      ) : query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <MessageState>Unable to load events. Please try again later.</MessageState>
      ) : events.length === 0 ? (
        <MessageState>{config.emptyMessage}</MessageState>
      ) : (
        <ul className={GRID}>
          {events.map((event) => (
            <EventCard key={event.id} event={event} config={config} />
          ))}
        </ul>
      )}
    </div>
  );
}
