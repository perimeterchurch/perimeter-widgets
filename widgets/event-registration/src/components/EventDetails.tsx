import * as React from 'react';
import { CalendarDays, MapPin, UserRound } from 'lucide-react';
import type { RegistrationEvent } from '@perimeter/api-hooks';
import { Button } from '@perimeter/ui/button';
import { RichText } from './RichText';
import { formatEventRange } from '../lib/format';

export interface EventDetailsProps {
  event: RegistrationEvent;
  imageUrl: string | null;
  fallbackImageUrl: string | undefined;
  showMap: boolean;
  returnUrl: string;
}

function EventImage({
  src,
  fallbackSrc,
  alt,
}: {
  src: string;
  fallbackSrc: string | undefined;
  alt: string;
}): React.JSX.Element | null {
  const [current, setCurrent] = React.useState<string | null>(src);
  const triedFallback = React.useRef(false);

  if (current === null) return null;

  return (
    <img
      src={current}
      alt={alt}
      className="max-h-80 w-full object-cover"
      onError={() => {
        if (!triedFallback.current && fallbackSrc) {
          triedFallback.current = true;
          setCurrent(fallbackSrc);
        } else {
          setCurrent(null);
        }
      }}
    />
  );
}

/**
 * The details block above the registration sections: image, title, when,
 * where (with rooms when the event shows them), who to contact, and the
 * event's description and meeting instructions. Mirrors what the native
 * details widget shows.
 */
export function EventDetails({
  event,
  imageUrl,
  fallbackImageUrl,
  showMap,
  returnUrl,
}: EventDetailsProps): React.JSX.Element {
  const location = event.location;
  const address = location
    ? [
        location.addressLine1,
        location.addressLine2,
        [location.city, location.state].filter(Boolean).join(', '),
        location.postalCode,
      ]
        .filter((part) => part && part.trim().length > 0)
        .join(', ')
    : '';

  return (
    <header className="grid gap-4">
      <div>
        <Button
          variant="link"
          size="sm"
          className="px-0"
          nativeButton={false}
          render={<a href={returnUrl} />}
        >
          ← Back to events
        </Button>
      </div>

      {imageUrl && <EventImage src={imageUrl} fallbackSrc={fallbackImageUrl} alt={event.title} />}

      <h1 className="font-serif text-3xl leading-tight font-bold text-balance text-fg">
        {event.title}
      </h1>

      <dl className="grid gap-2 text-sm text-muted-fg">
        <div className="flex items-start gap-2">
          <CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0" />
          <dd>{formatEventRange(event.startDate, event.endDate, event.timeZone)}</dd>
        </div>
        {location && (location.name || address) && (
          <div className="flex items-start gap-2">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
            <dd className="grid gap-0.5">
              {location.name && <span className="text-fg">{location.name}</span>}
              {address && <span>{address}</span>}
              {location.rooms.length > 0 && <span>{location.rooms.join(' · ')}</span>}
              {showMap && location.directionsUrl && (
                <a
                  href={location.directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Get directions
                </a>
              )}
            </dd>
          </div>
        )}
        {event.primaryContact && (
          <div className="flex items-start gap-2">
            <UserRound aria-hidden className="mt-0.5 size-4 shrink-0" />
            <dd>
              Event contact: <span className="text-fg">{event.primaryContact.displayName}</span>
              {event.primaryContact.emailAddress && (
                <>
                  {' · '}
                  <a
                    href={`mailto:${event.primaryContact.emailAddress}`}
                    className="text-primary underline"
                  >
                    {event.primaryContact.emailAddress}
                  </a>
                </>
              )}
            </dd>
          </div>
        )}
      </dl>

      <RichText html={event.descriptionHtml} className="text-base leading-relaxed" />
    </header>
  );
}
