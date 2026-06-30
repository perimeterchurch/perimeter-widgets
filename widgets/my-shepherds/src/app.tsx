import * as React from 'react';
import { useShepherds } from '@perimeter/api-hooks';
import { Card } from '@perimeter/ui/card';
import { Skeleton } from '@perimeter/ui/skeleton';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@perimeter/ui/empty';
import { ShepherdCard } from './components/ShepherdCard';

export interface AppProps {
  config: { title: string };
}

function LoadingCard(): React.JSX.Element {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-5">
        <Skeleton className="size-24 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
    </Card>
  );
}

export function App({ config }: AppProps): React.JSX.Element {
  const { data, isPending, isError } = useShepherds();
  const shepherds = data?.data.shepherds ?? [];

  return (
    <div className="p-4">
      <h2 className="mb-4 text-3xl font-bold text-fg">{config.title}</h2>

      {isPending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          <LoadingCard />
        </div>
      ) : isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>We couldn&apos;t load your shepherds</EmptyTitle>
            <EmptyDescription>Please refresh the page or try again later.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : shepherds.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No shepherds assigned yet</EmptyTitle>
            <EmptyDescription>
              You don&apos;t have any shepherds or elders assigned right now.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {shepherds.map((shepherd, i) => (
            <ShepherdCard
              key={`${shepherd.Email_Address ?? shepherd.Elder_Name}-${i}`}
              shepherd={shepherd}
            />
          ))}
        </div>
      )}
    </div>
  );
}
