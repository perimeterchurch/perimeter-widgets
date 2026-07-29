import * as React from 'react';
import { useCommunityGroupFacets, useCommunityGroups } from '@perimeter/api-hooks';
import { Skeleton } from '@perimeter/ui/skeleton';
import type { CommunityGroupFinderConfig } from './types';
import { GroupCard } from './components/GroupCard';
import { GroupFilters } from './components/GroupFilters';
import { EMPTY_FILTERS, parseIdList, toQueryParams, type FilterState } from './lib/filters';

export interface AppProps {
  config: CommunityGroupFinderConfig;
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
    <div className="flex min-h-32 items-center justify-center border border-border bg-muted p-6 text-center font-sans text-sm text-muted-fg">
      {children}
    </div>
  );
}

export function App({ config }: AppProps): React.JSX.Element {
  // A host page can lock the widget to one or more neighborhoods. Those ids are
  // pinned into the query and the Neighborhood filter is hidden, so a visitor
  // cannot widen past the page they are on.
  const lockedNeighborhoodIds = React.useMemo(
    () => parseIdList(config.neighborhoodIds),
    [config.neighborhoodIds],
  );
  const neighborhoodLocked = lockedNeighborhoodIds.length > 0;

  const [filters, setFilters] = React.useState<FilterState>({
    ...EMPTY_FILTERS,
    location: config.location ?? '',
  });
  const [advancedOpen, setAdvancedOpen] = React.useState(config.advancedOpen);

  const facetsQuery = useCommunityGroupFacets({ groupTypeId: config.groupTypeId });
  const facets = facetsQuery.data?.data;

  const groupsQuery = useCommunityGroups({
    groupTypeId: config.groupTypeId,
    ...toQueryParams(filters),
    // A locked neighborhood wins over the (hidden) filter value.
    ...(neighborhoodLocked ? { neighborhoodIds: lockedNeighborhoodIds.join(',') } : {}),
    ...(config.hideFull ? { includeFull: 'false' as const } : {}),
    // No pagination UI: request the max page size. maxGroups caps the list
    // client-side — the endpoint has no equivalent parameter.
    perPage: 100,
  });

  const allGroups = groupsQuery.data?.data.groups ?? [];
  const groups = config.maxGroups ? allGroups.slice(0, config.maxGroups) : allGroups;

  const clearFilters = () => setFilters({ ...EMPTY_FILTERS, location: config.location ?? '' });

  return (
    <div className="@container p-4 text-left">
      {config.showFilters && (
        <GroupFilters
          filters={filters}
          onChange={setFilters}
          onClear={clearFilters}
          showSearch={config.showSearch}
          showNeighborhood={!neighborhoodLocked}
          advancedOpen={advancedOpen}
          onAdvancedOpenChange={setAdvancedOpen}
          neighborhoods={facets?.neighborhoods ?? []}
          focuses={facets?.focuses ?? []}
          lifeStages={facets?.lifeStages ?? []}
          facetsLoading={facetsQuery.isLoading}
        />
      )}

      {groupsQuery.isLoading ? (
        <LoadingState />
      ) : groupsQuery.isError ? (
        <MessageState>Unable to load community groups. Please try again later.</MessageState>
      ) : groups.length === 0 ? (
        <MessageState>{config.emptyMessage}</MessageState>
      ) : (
        <ul className={GRID}>
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} config={config} />
          ))}
        </ul>
      )}
    </div>
  );
}
