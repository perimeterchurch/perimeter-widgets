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
  // A host page can lock the widget to one or more cities. Those ids are pinned
  // into the query and the City filter is hidden, so a visitor cannot widen
  // past the page they are on.
  const lockedNeighborhoodIds = React.useMemo(
    () => parseIdList(config.neighborhoodIds),
    [config.neighborhoodIds],
  );
  const neighborhoodLocked = lockedNeighborhoodIds.length > 0;

  // The owning ministry is a property of the page, not something a visitor
  // browses, so this has no filter control — it just narrows every request.
  // The facets request carries it too, so the dropdowns that DO exist offer
  // only values this ministry's groups use.
  const lockedMinistryIds = React.useMemo(
    () => parseIdList(config.ministryIds),
    [config.ministryIds],
  );
  const ministryParam =
    lockedMinistryIds.length > 0 ? { ministryIds: lockedMinistryIds.join(',') } : {};

  const [filters, setFilters] = React.useState<FilterState>(EMPTY_FILTERS);
  const [advancedOpen, setAdvancedOpen] = React.useState(config.advancedOpen);

  const facetsQuery = useCommunityGroupFacets({
    groupTypeId: config.groupTypeId,
    ...ministryParam,
  });
  const facets = facetsQuery.data?.data;

  const groupsQuery = useCommunityGroups({
    groupTypeId: config.groupTypeId,
    ...ministryParam,
    ...toQueryParams(filters),
    // A locked city wins over the (hidden) filter value.
    ...(neighborhoodLocked ? { neighborhoodIds: lockedNeighborhoodIds.join(',') } : {}),
    ...(config.showFullGroups ? {} : { includeFull: 'false' as const }),
    ...(config.countGroupInquiries ? { countGroupInquiries: 'true' as const } : {}),
    ...(config.showFutureGroups ? {} : { showFutureGroups: 'false' as const }),
    // No pagination UI: request the max page size. maxGroups caps the list
    // client-side — the endpoint has no equivalent parameter.
    perPage: 100,
  });

  const allGroups = groupsQuery.data?.data.groups ?? [];
  const groups = config.maxGroups ? allGroups.slice(0, config.maxGroups) : allGroups;

  return (
    <div className="@container p-4 text-left">
      {config.showFilters && (
        <GroupFilters
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters(EMPTY_FILTERS)}
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
