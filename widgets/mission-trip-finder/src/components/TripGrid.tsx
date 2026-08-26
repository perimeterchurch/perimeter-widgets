import * as React from 'react';
import { useMissionTrips } from '@perimeter/api-hooks';
import { Skeleton } from '@perimeter/ui/skeleton';
import type { MissionTripFinderConfig } from '../types';
import { TripCard } from './TripCard';

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

export function TripGrid({
  config,
  onOpenTrip,
}: {
  config: MissionTripFinderConfig;
  onOpenTrip: (id: number) => void;
}): React.JSX.Element {
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

  // The browse view owns its padding: the detail's hero is full-bleed, so the
  // shared container above cannot carry it.
  return (
    <div className="p-4">
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <MessageState>Unable to load mission trips. Please try again later.</MessageState>
      ) : trips.length === 0 ? (
        <MessageState>{config.emptyMessage}</MessageState>
      ) : (
        <ul className={GRID}>
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} config={config} onOpen={onOpenTrip} />
          ))}
        </ul>
      )}
    </div>
  );
}
