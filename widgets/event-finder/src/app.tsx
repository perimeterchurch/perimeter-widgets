import * as React from 'react';
import { useEvents, type EventListItem } from '@perimeter/api-hooks';
import { Button } from '@perimeter/ui/button';
import { Skeleton } from '@perimeter/ui/skeleton';
import { cn } from '@perimeter/ui/utils/cn';
import type { EventFinderConfig } from './types';
import { eventImageUrl, formatEventDate, formatEventDateAlt } from './lib/format';

export interface AppProps {
  config: EventFinderConfig;
}

const IMAGE_BOX = 'w-full overflow-hidden aspect-video bg-muted';

/**
 * Event artwork with a loading skeleton and a graceful fallback when the image
 * endpoint 404s (the event has no default image in MP). Mirrors the
 * FallbackImage pattern in the sermons/latest-sermon widgets.
 */
function EventImage({ src, alt }: { src: string; alt: string }): React.JSX.Element {
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  if (failed) {
    return (
      <div
        className={cn('flex items-center justify-center text-muted-fg', IMAGE_BOX)}
        aria-hidden="true"
      >
        <CalendarIcon className="h-2/5 w-2/5 max-h-16 max-w-16 opacity-40" />
      </div>
    );
  }

  return (
    <div className={cn('relative', IMAGE_BOX)}>
      {!loaded && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
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

function CalendarIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
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
        <EventImage src={eventImageUrl(event.id, config.apiUrl)} alt={event.title} />
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-sans text-xl leading-snug font-bold text-balance">{event.title}</h3>
        <p className="font-sans text-sm font-medium text-muted-fg">{dateText}</p>
        {event.location && <p className="font-sans text-sm text-muted-fg">{event.location}</p>}

        {config.showDescription && event.description && (
          <div
            className="mt-1 text-sm leading-relaxed [&_a]:underline"
            // MP stores the description as sanitized HTML authored by staff.
            dangerouslySetInnerHTML={{ __html: event.description }}
          />
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
