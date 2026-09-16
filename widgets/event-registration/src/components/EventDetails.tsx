import * as React from 'react';
import { CalendarDays, MapPin, UserRound } from 'lucide-react';
import type { RegistrationEvent } from '@perimeter/api-hooks';
import { ExpandableText } from './ExpandableText';
import { FallbackImage } from './FallbackImage';
import { RichText } from './RichText';
import { formatEventRange, htmlToText } from '../lib/format';

export interface EventDetailsProps {
  event: RegistrationEvent;
  imageUrl: string | null;
  fallbackImageUrl: string | undefined;
  showMap: boolean;
}

/**
 * The details block above the registration sections: image, title, when,
 * where (with rooms when the event shows them), who to contact, and the
 * event's description. On phones the image bleeds to the widget's edges and
 * the description is clipped behind "Read more"; from 768px it is the full
 * hero the native details widget shows.
 */
export function EventDetails({
  event,
  imageUrl,
  fallbackImageUrl,
  showMap,
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
      {imageUrl && (
        <FallbackImage
          sources={[imageUrl, fallbackImageUrl]}
          alt={event.title}
          className="-mx-4 aspect-video w-[calc(100%+32px)] @min-[768px]:mx-0 @min-[768px]:aspect-auto @min-[768px]:max-h-80 @min-[768px]:w-full"
          imgClassName="@min-[768px]:max-h-80"
        />
      )}

      <h1 className="font-serif text-2xl leading-tight font-normal text-balance text-fg @min-[768px]:text-3xl">
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
                  className="inline-flex min-h-11 items-center text-primary underline @min-[768px]:min-h-0"
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

      <ExpandableText
        summary={htmlToText(event.descriptionHtml)}
        lines={3}
        label="Read more"
        desktopAlwaysOpen
      >
        <RichText html={event.descriptionHtml} className="text-base leading-relaxed" />
      </ExpandableText>
    </header>
  );
}
