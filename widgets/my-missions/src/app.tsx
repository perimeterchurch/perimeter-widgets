import * as React from 'react';
import { ApiError, useMyMissionTrips, type MyMissionTrip } from '@perimeter/api-hooks';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@perimeter/ui/empty';
import { Skeleton } from '@perimeter/ui/skeleton';
import { TripsAccordion } from './components/TripsAccordion';
import { partitionTrips } from './lib/trips';

export interface AppProps {
  config: {
    title: string;
    currentTitle: string;
    pastTitle: string;
    showPastTrips: boolean;
  };
}

function LoadingState(): React.JSX.Element {
  return (
    <div className="grid gap-2" aria-busy="true">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

function ErrorState({ error }: { error: unknown }): React.JSX.Element {
  const isAuth = error instanceof ApiError && error.isAuthError;
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{isAuth ? 'Your session has expired' : 'Unable to load your trips'}</EmptyTitle>
        <EmptyDescription>
          {isAuth
            ? 'Please sign in again to view your mission trips.'
            : 'Something went wrong loading your mission trips. Please try again later.'}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function TripSection({
  title,
  trips,
}: {
  title: string;
  trips: readonly MyMissionTrip[];
}): React.JSX.Element | null {
  if (trips.length === 0) return null;
  return (
    <section className="grid gap-2">
      <h3 className="text-xl font-semibold text-fg">{title}</h3>
      <TripsAccordion trips={trips} />
    </section>
  );
}

export function App({ config }: AppProps): React.JSX.Element {
  const query = useMyMissionTrips();
  // Stable identity: a fresh `?? []` each render would re-run the memo below.
  const trips = React.useMemo(() => query.data?.data.trips ?? [], [query.data]);
  const { current, past } = React.useMemo(() => partitionTrips(trips), [trips]);

  const visiblePast = config.showPastTrips ? past : [];
  const isEmpty = current.length === 0 && visiblePast.length === 0;

  return (
    <div className="grid gap-6 p-4 text-fg">
      <h2 className="text-2xl font-bold">{config.title}</h2>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} />
      ) : isEmpty ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No mission trips yet</EmptyTitle>
            <EmptyDescription>
              When you sign up for a mission trip, it will appear here with your fundraising
              progress and support letter.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <TripSection title={config.currentTitle} trips={current} />
          <TripSection title={config.pastTitle} trips={visiblePast} />
        </>
      )}
    </div>
  );
}
