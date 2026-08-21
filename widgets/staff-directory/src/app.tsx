import * as React from 'react';
import { useStaffDirectory, useStaffDirectoryFacets } from '@perimeter/api-hooks';
import { Skeleton } from '@perimeter/ui/skeleton';
import { cn } from '@perimeter/ui/utils/cn';
import type { StaffDirectoryConfig } from './types';
import { StaffCard } from './components/StaffCard';
import { StaffFilters } from './components/StaffFilters';
import { gridColumnsClass } from './lib/format';

export interface AppProps {
  config: StaffDirectoryConfig;
}

/**
 * Parse a comma-separated config value into ids, dropping anything unusable.
 * Used to lock the widget to specific ministries, employment types, or a pinned
 * roster.
 */
export function parseIdList(csv: string | undefined): number[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isInteger(n) && n > 0);
}

function LoadingState({ columns }: { columns: number }): React.JSX.Element {
  return (
    <ul className={cn('grid gap-2', gridColumnsClass(columns))}>
      {Array.from({ length: columns * 2 }, (_, i) => (
        <li key={i}>
          <Skeleton className="aspect-[4/5] w-full rounded-none" />
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
  // A host page can lock the widget to specific ministries — a per-ministry
  // staff page. Those ids are pinned into the query and the dropdown is hidden,
  // so a visitor cannot widen past the page they are on.
  const lockedMinistryIds = React.useMemo(
    () => parseIdList(config.ministryIds),
    [config.ministryIds],
  );
  const ministryLocked = lockedMinistryIds.length > 0;

  const personnelTypeIds = React.useMemo(
    () => parseIdList(config.personnelTypeIds),
    [config.personnelTypeIds],
  );
  const contactIds = React.useMemo(() => parseIdList(config.contactIds), [config.contactIds]);

  const [search, setSearch] = React.useState('');
  const [selectedMinistryIds, setSelectedMinistryIds] = React.useState<number[]>([]);

  // Every request carries the locked ids and employment types, the facets
  // request included — so the dropdown offers only ministries this page's staff
  // actually belong to.
  const scope = {
    ...(ministryLocked ? { ministryIds: lockedMinistryIds.join(',') } : {}),
    ...(personnelTypeIds.length > 0 ? { personnelTypeIds: personnelTypeIds.join(',') } : {}),
  };

  const facetsQuery = useStaffDirectoryFacets(scope, {
    enabled: config.showMinistryFilter && !ministryLocked,
  });

  const staffQuery = useStaffDirectory({
    ...scope,
    // A locked ministry wins over the (hidden) dropdown value.
    ...(!ministryLocked && selectedMinistryIds.length > 0
      ? { ministryIds: selectedMinistryIds.join(',') }
      : {}),
    ...(contactIds.length > 0 ? { contactIds: contactIds.join(',') } : {}),
    ...(search.trim() ? { keyword: search.trim() } : {}),
    // No pagination UI: the directory is a few hundred people and the grid shows
    // them all. maxStaff caps the list client-side.
    perPage: 500,
  });

  const allStaff = staffQuery.data?.data.staff ?? [];
  const staff = config.maxStaff ? allStaff.slice(0, config.maxStaff) : allStaff;

  const hasQuery = search.trim().length > 0 || selectedMinistryIds.length > 0;

  return (
    <div className="@container p-4 text-left">
      {config.title && (
        <h2 className="mb-2 text-center font-serif text-4xl leading-tight font-normal text-balance text-fg @2xl:text-5xl">
          {config.title}
        </h2>
      )}
      {config.intro && (
        <p className="mx-auto mb-6 max-w-2xl text-center font-sans text-base text-muted-fg">
          {config.intro}
        </p>
      )}

      <StaffFilters
        search={search}
        onSearchChange={setSearch}
        ministryIds={selectedMinistryIds}
        onMinistryIdsChange={setSelectedMinistryIds}
        showSearch={config.showSearch}
        showMinistryFilter={config.showMinistryFilter && !ministryLocked}
        ministries={facetsQuery.data?.data.ministries ?? []}
        facetsLoading={facetsQuery.isLoading}
      />

      {staffQuery.isLoading ? (
        <LoadingState columns={config.columns} />
      ) : staffQuery.isError ? (
        <MessageState>Unable to load the staff directory. Please try again later.</MessageState>
      ) : staff.length === 0 ? (
        <MessageState>{hasQuery ? config.emptyMessage : 'No staff members to show.'}</MessageState>
      ) : (
        <ul className={cn('grid gap-2', gridColumnsClass(config.columns))}>
          {staff.map((member) => (
            <StaffCard key={member.personnelId} member={member} config={config} />
          ))}
        </ul>
      )}
    </div>
  );
}
