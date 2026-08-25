import * as React from 'react';
import type { MissionTrip } from '@perimeter/api-hooks';
import { Badge } from '@perimeter/ui/badge';
import type { MissionTripFinderConfig } from '../types';
import { formatCost, formatTripDates, spotsRemaining } from '../lib/format';
import { TripBanner } from './TripBanner';
import { TripFact, ICON } from './TripFact';
import { CalendarIcon, MoneyIcon, PersonIcon, PinIcon } from './icons';

const SHELL =
  'group relative flex w-full flex-col overflow-hidden rounded-none border border-border bg-bg text-left text-fg no-underline shadow-xs transition-shadow hover:shadow-md';

export function TripCard({
  trip,
  config,
  onOpen,
}: {
  trip: MissionTrip;
  config: MissionTripFinderConfig;
  /** Omitted when `detailsUrlBase` is set — the card links out instead. */
  onOpen?: (id: number) => void;
}): React.JSX.Element {
  const dates = formatTripDates(trip.startDate, trip.endDate);
  const spotsLeft = spotsRemaining(trip.registrantCount, trip.maximumRegistrants);

  const body = (
    <>
      <TripBanner
        src={trip.bannerUrl}
        fallbackSrc={config.defaultImageUrl}
        alt={trip.destination ?? trip.name}
      />

      {(trip.registrationFull || trip.invitationOnly) && (
        <div className="absolute top-2 right-2 flex flex-col items-end gap-2">
          {trip.registrationFull && <Badge variant="warning">Registration Full</Badge>}
          {trip.invitationOnly && <Badge variant="secondary">Invitation Only</Badge>}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-sans text-xl leading-snug font-bold text-balance group-hover:underline">
          {trip.name}
        </h3>

        {trip.destination && (
          <TripFact icon={<PinIcon className={ICON} />}>{trip.destination}</TripFact>
        )}
        {dates && <TripFact icon={<CalendarIcon className={ICON} />}>{dates}</TripFact>}
        {config.showCost && trip.cost !== null && (
          <TripFact icon={<MoneyIcon className={ICON} />}>{formatCost(trip.cost)}</TripFact>
        )}
        {config.showSpots && spotsLeft !== null && !trip.registrationFull && (
          <TripFact icon={<PersonIcon className={ICON} />}>
            {spotsLeft === 1 ? '1 spot left' : `${spotsLeft} spots left`}
          </TripFact>
        )}

        {config.showDescription && trip.description && (
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line">{trip.description}</p>
        )}
      </div>
    </>
  );

  return (
    <li className="flex">
      {/* An anchor when the embed hands off to a separate details page, a
          button when the detail opens in place. A <button> rather than a
          href-less <a> so keyboard and screen-reader semantics match what the
          click actually does. */}
      {config.detailsUrlBase ? (
        <a href={`${config.detailsUrlBase}${trip.id}`} className={SHELL}>
          {body}
        </a>
      ) : (
        <button type="button" onClick={() => onOpen?.(trip.id)} className={SHELL}>
          {body}
        </button>
      )}
    </li>
  );
}
