import * as React from 'react';
import { ApiError, useGivingHistory } from '@perimeter/api-hooks';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@perimeter/ui/empty';
import { Skeleton } from '@perimeter/ui/skeleton';
import { GivingFilters } from './components/GivingFilters';
import { GivingChart } from './components/GivingChart';
import { GivingTable } from './components/GivingTable';
import { EMPTY_FILTERS, filterItems, filterOptions, type GivingFilterState } from './lib/giving';

export interface AppProps {
  config: { title: string };
}

function LoadingState(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-9 w-full max-w-md" />
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function ErrorState({ error }: { error: unknown }): React.JSX.Element {
  const isAuth = error instanceof ApiError && error.isAuthError;
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>
          {isAuth ? 'Your session has expired' : 'Unable to load giving history'}
        </EmptyTitle>
        <EmptyDescription>
          {isAuth
            ? 'Please sign in again to view your giving history.'
            : 'Something went wrong loading your giving history. Please try again later.'}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function App({ config }: AppProps): React.JSX.Element {
  const query = useGivingHistory();
  // Stable identity: a fresh `?? []` each render would re-run the memos below.
  const allItems = React.useMemo(() => query.data?.data.items ?? [], [query.data]);

  const [filters, setFilters] = React.useState<GivingFilterState>(EMPTY_FILTERS);
  const options = React.useMemo(() => filterOptions(allItems), [allItems]);
  const filtered = React.useMemo(() => filterItems(allItems, filters), [allItems, filters]);

  return (
    <div className="grid gap-4 p-4 text-fg">
      <h2 className="text-xl font-semibold">{config.title}</h2>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} />
      ) : allItems.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No giving history yet</EmptyTitle>
            <EmptyDescription>
              When you give to Perimeter, your gifts will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <GivingFilters options={options} filters={filters} onChange={setFilters} />
          <GivingChart items={filtered} />
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-fg">No gifts match the selected filters.</p>
          ) : (
            <GivingTable items={filtered} />
          )}
        </>
      )}
    </div>
  );
}
