import * as React from 'react';
import { useMissionTrips, type MissionTrip } from '@perimeter/api-hooks';
import { Badge } from '@perimeter/ui/badge';
import { Skeleton } from '@perimeter/ui/skeleton';
import { cn } from '@perimeter/ui/utils/cn';
import type { MissionTripFinderConfig } from './types';
import { formatCost, formatTripDates, spotsRemaining } from './lib/format';

export interface AppProps {
  config: MissionTripFinderConfig;
}

const IMAGE_BOX = 'w-full overflow-hidden aspect-video bg-muted';
const ICON = 'h-4 w-4';

function GlobeIcon({ className }: { className?: string }): React.JSX.Element {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
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

function MoneyIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

function PersonIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

/**
 * Destination banner with a loading skeleton, falling back to the configured
 * default image and then to a globe placeholder. Banners are absolute URLs
 * stored on Journey_Destinations rather than something our API serves, so a
 * dead link is a content problem — the fallback chain keeps the card intact.
 */
function TripBanner({
  src,
  fallbackSrc,
  alt,
}: {
  src: string | null;
  fallbackSrc?: string | undefined;
  alt: string;
}): React.JSX.Element {
  const initialSrc = src ?? fallbackSrc ?? null;
  const [loaded, setLoaded] = React.useState(false);
  const [currentSrc, setCurrentSrc] = React.useState(initialSrc);
  const [failed, setFailed] = React.useState(false);
  const triedFallback = React.useRef(false);

  // Each card is keyed by trip id, so this state resets per trip without
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
        className={cn('flex items-center justify-center text-muted-fg', IMAGE_BOX)}
        aria-hidden="true"
      >
        <GlobeIcon className="h-2/5 max-h-16 w-2/5 max-w-16 opacity-40" />
      </div>
    );
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

function TripFact({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <p className="flex items-center gap-2 font-sans text-sm text-muted-fg">
      <span className="shrink-0">{icon}</span>
      <span>{children}</span>
    </p>
  );
}

function TripCard({
  trip,
  config,
}: {
  trip: MissionTrip;
  config: MissionTripFinderConfig;
}): React.JSX.Element {
  const dates = formatTripDates(trip.startDate, trip.endDate);
  const spotsLeft = spotsRemaining(trip.registrantCount, trip.maximumRegistrants);

  return (
    <li className="flex">
      <a
        href={`${config.detailsUrlBase}${trip.id}`}
        className="group relative flex w-full flex-col overflow-hidden rounded-none border border-border bg-bg text-fg no-underline shadow-xs transition-shadow hover:shadow-md"
      >
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
      </a>
    </li>
  );
}

const GRID = 'grid grid-cols-1 gap-4 @md:grid-cols-2 @2xl:grid-cols-3';

function LoadingState(): React.JSX.Element {
  return (
    <ul className={GRID}>
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className="flex flex-col overflow-hidden rounded-none border border-border">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
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
  const query = useMissionTrips({
    ...(config.includePast ? { includePast: 'true' as const } : {}),
    ...(config.hideFull ? { includeFull: 'false' as const } : {}),
    ...(config.destinationId ? { destinationId: config.destinationId } : {}),
    ...(config.keyword ? { keyword: config.keyword } : {}),
    // No pagination UI: request the max page size. maxTrips caps the list
    // client-side — the endpoint has no equivalent parameter.
    perPage: 100,
  });

  const allTrips = query.data?.data.trips ?? [];
  const trips = config.maxTrips ? allTrips.slice(0, config.maxTrips) : allTrips;

  return (
    <div className="@container p-4 text-left">
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <MessageState>Unable to load mission trips. Please try again later.</MessageState>
      ) : trips.length === 0 ? (
        <MessageState>{config.emptyMessage}</MessageState>
      ) : (
        <ul className={GRID}>
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} config={config} />
          ))}
        </ul>
      )}
    </div>
  );
}
