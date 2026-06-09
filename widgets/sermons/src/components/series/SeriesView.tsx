import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@perimeter/ui/input-group';
import { Button } from '@perimeter/ui/button';
import { MultiCombobox } from '@perimeter/ui/multi-combobox';
import type { MultiComboboxOption } from '@perimeter/ui/multi-combobox';
import { SkeletonTransition } from '@perimeter/ui/skeleton-transition';
import { Search, X, Calendar, Type, Hash, LayoutGrid, List, Rows3 } from 'lucide-react';
import { useSeries, useSeriesTypes } from '@perimeter/api-hooks';
import type { SermonsConfig, SortField } from '../../types';
import type { ContainerBreakpoint } from '../../lib/breakpoint';
import { DateRangePicker } from '../ui/DateRangePicker';
import { CollapsibleFilters } from '../ui/CollapsibleFilters';
import { SeriesGrid } from './SeriesGrid';
import { ResultsError, ResultsEmpty } from '../ui/ResultsState';
import { ResultsToolbar } from '../ui/ResultsToolbar';
import { ResultsPagination } from '../ui/ResultsPagination';
import { SermonSkeleton } from '../ui/SermonSkeleton';
import type { useSermonFilters } from '../../hooks/use-sermon-filters';
import { defined, idsParam } from '../../lib/query-params';

interface SeriesViewProps {
  config: SermonsConfig;
  filters: ReturnType<typeof useSermonFilters>;
  /** Container breakpoint; on `phone` the inline filter rows collapse behind a toggle. */
  breakpoint: ContainerBreakpoint;
}

type SeriesViewMode = 'grid' | 'list' | 'large';

const SORT_FIELDS = [
  {
    value: 'date',
    label: 'Date',
    icon: <Calendar className="h-3.5 w-3.5" />,
  },
  {
    value: 'title',
    label: 'Title',
    icon: <Type className="h-3.5 w-3.5" />,
  },
  {
    value: 'count',
    label: 'Sermon Count',
    icon: <Hash className="h-3.5 w-3.5" />,
  },
];

const VIEW_OPTIONS = [
  {
    value: 'grid',
    label: 'Grid',
    icon: <LayoutGrid className="h-3.5 w-3.5" />,
  },
  {
    value: 'list',
    label: 'Small List',
    icon: <List className="h-3.5 w-3.5" />,
  },
  {
    value: 'large',
    label: 'Large List',
    icon: <Rows3 className="h-3.5 w-3.5" />,
  },
];

export function SeriesView({ config, filters, breakpoint }: SeriesViewProps) {
  const viewMode = filters.view;
  const display = config.display ?? 'full';
  const showSearch = display === 'full';
  const showSortView = display !== 'headless';
  // Series-type dropdown is opt-in via showSeriesType. The default
  // seriesTypeId="1" (Sunday Morning Sermon) from applyWidgetDefaults
  // also keeps it hidden by setting the value (which the user can't
  // change without enabling the dropdown).
  const showSeriesTypeFilter =
    display === 'full' && config.showSeriesType === true && !config.seriesTypeId;

  // Config-pinned series type (e.g. the "Sunday Morning Sermon" default)
  // narrows every series query as a baseline.
  const pinnedSeriesTypeId = config.seriesTypeId || undefined;
  const seriesTypeId = idsParam(filters.selectedSeriesTypeIds) ?? pinnedSeriesTypeId;

  const seriesTypesQuery = useSeriesTypes({});
  const seriesTypes = seriesTypesQuery.data?.data ?? [];
  const seriesTypesLoading = seriesTypesQuery.isLoading;
  const seriesTypeOptions: MultiComboboxOption[] = seriesTypes.map((st) => ({
    value: String(st.id),
    label: st.name,
  }));

  const { data, isLoading, error, refetch } = useSeries(
    defined({
      search: filters.search || undefined,
      seriesTypeId,
      from: filters.from ?? undefined,
      to: filters.to ?? undefined,
      page: filters.page,
      perPage: config.perPage,
      sort: filters.sort,
      order: filters.order,
    }),
  );

  const seriesList = data?.data.series ?? [];
  const pagination = data?.data.pagination;

  return (
    <div className="space-y-4">
      {/* Row 1: Search */}
      {showSearch && (
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={filters.search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => filters.setSearch(e.target.value)}
            placeholder="Search series..."
          />
          {filters.search && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="Clear search"
                onClick={() => filters.setSearch('')}
              >
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      )}

      <CollapsibleFilters
        breakpoint={breakpoint}
        activeFilterCount={filters.activeFilterCount}
        hasActive={filters.hasActiveFilters}
        onClear={filters.clearFilters}
      >
        {/* Row 2: Series Type filter */}
        {showSeriesTypeFilter && (
          <div className="flex items-center gap-2">
            <MultiCombobox
              options={seriesTypeOptions}
              value={filters.selectedSeriesTypeIds.map(String)}
              onValueChange={(v: string[]) => filters.setSeriesTypeIds(v.map(Number))}
              placeholder="All Series Types"
              selectedLabel="Series Types"
              disabled={seriesTypesLoading}
              className="flex-1"
              multiple
            />
          </div>
        )}

        {/* Row 3: Date range + clear all */}
        {showSearch && (
          <div className="flex items-center gap-3">
            <DateRangePicker
              from={filters.from ?? ''}
              to={filters.to ?? ''}
              onRangeChange={(from, to) => filters.setDateRange(from || null, to || null)}
            />
            <div className="flex-1" />
            {breakpoint !== 'phone' && filters.hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={filters.clearFilters}>
                <X className="h-3.5 w-3.5" />
                Clear All
              </Button>
            )}
          </div>
        )}
      </CollapsibleFilters>

      {/* Results header: count + sort + view (shared extract) */}
      {showSortView && (
        <ResultsToolbar
          count={pagination ? pagination.total : null}
          noun="series"
          sortField={filters.sort}
          sortDirection={filters.order}
          sortFields={SORT_FIELDS}
          onSortFieldChange={(field) => filters.setSort(field as SortField, filters.order)}
          onSortDirectionChange={(direction) => filters.setSort(filters.sort, direction)}
          viewMode={viewMode}
          viewOptions={VIEW_OPTIONS}
          onViewModeChange={(v) => filters.setView(v as SeriesViewMode)}
        />
      )}

      {error ? (
        // A failed query gets a distinct themed error block (not the empty
        // state), so an API outage doesn't read as "no results".
        <ResultsError
          noun="series"
          onRetry={() => {
            void refetch();
          }}
        />
      ) : (
        <SkeletonTransition
          isLoading={isLoading}
          skeleton={<SermonSkeleton viewMode={viewMode} count={config.perPage} />}
        >
          {seriesList.length === 0 ? (
            <ResultsEmpty
              noun="series"
              hasActiveFilters={filters.hasActiveFilters}
              onClearFilters={filters.clearFilters}
            />
          ) : (
            <SeriesGrid
              series={seriesList}
              viewMode={viewMode}
              onSeriesClick={(id: number) => filters.setScreen('detail', id)}
              config={config}
            />
          )}
        </SkeletonTransition>
      )}

      {!config.hidePagination && pagination && (
        <ResultsPagination
          page={filters.page}
          totalPages={pagination.totalPages}
          onPageChange={filters.setPage}
          label="Series results pagination"
        />
      )}
    </div>
  );
}
