import { useState } from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@perimeter/ui/input-group';
import { Button } from '@perimeter/ui/button';
import { MultiCombobox } from '@perimeter/ui/multi-combobox';
import type { MultiComboboxOption } from '@perimeter/ui/multi-combobox';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@perimeter/ui/pagination';
import { Skeleton } from '@perimeter/ui/skeleton';
import { SortSelect } from '@perimeter/ui/sort-select';
import { IconSelect } from '@perimeter/ui/icon-select';
import { SkeletonTransition } from '@perimeter/ui/skeleton-transition';
import { Search, X, Calendar, Type, Hash, LayoutGrid, Eye, List, Rows3 } from 'lucide-react';
import { useSeries, useSeriesTypes } from '@perimeter/api-hooks';
import type { SermonsConfig, SortField, SortOrder } from '../../types';
import { DateRangePicker } from '../ui/DateRangePicker';
import { SeriesGrid } from './SeriesGrid';
import { ResultsError, ResultsEmpty } from '../ui/ResultsState';
import type { useSermonFilters } from '../../hooks/use-sermon-filters';
import { getPageRange } from '../../lib/pagination';
import { defined, idsParam } from '../../lib/query-params';

interface SeriesViewProps {
  config: SermonsConfig;
  filters: ReturnType<typeof useSermonFilters>;
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

export function SeriesView({ config, filters }: SeriesViewProps) {
  const [viewMode, setViewMode] = useState<SeriesViewMode>('grid');
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
          {filters.hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={filters.clearFilters}>
              <X className="h-3.5 w-3.5" />
              Clear All
            </Button>
          )}
        </div>
      )}

      {/* Results header: count + sort + view */}
      {showSortView && (
        <div className="flex items-center justify-between">
          <span data-slot="results-count" className="text-sm text-[var(--color-muted-fg)]">
            {/* Reserve the line height even before the count loads so the
                toolbar row doesn't reflow when results arrive. */}
            {pagination ? `${pagination.total} series` : ' '}
          </span>
          <div className="flex items-center gap-2">
            <SortSelect
              sortField={filters.sort}
              sortDirection={filters.order}
              onSortFieldChange={(field: string) =>
                filters.setSort(field as SortField, filters.order)
              }
              onSortDirectionChange={(direction: SortOrder) =>
                filters.setSort(filters.sort, direction)
              }
              fields={SORT_FIELDS}
            />
            <IconSelect
              value={viewMode}
              onChange={(v: string) => setViewMode(v as SeriesViewMode)}
              options={VIEW_OPTIONS}
              label="View:"
              icon={<Eye className="h-3.5 w-3.5 shrink-0" />}
            />
          </div>
        </div>
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
          skeleton={
            <div className="grid grid-cols-1 gap-4 @[30rem]:grid-cols-2 @[48rem]:grid-cols-3">
              {Array.from({ length: config.perPage }, (_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-lg" />
              ))}
            </div>
          }
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

      {!config.hidePagination && pagination && pagination.totalPages > 1 && (
        <Pagination aria-label="Series results pagination">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => filters.setPage(Math.max(1, filters.page - 1))}
                aria-disabled={filters.page <= 1}
                className={filters.page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {getPageRange(filters.page, pagination.totalPages).map((item, idx) =>
              item === 'ellipsis' ? (
                <PaginationItem key={`e-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationLink
                    isActive={item === filters.page}
                    onClick={() => filters.setPage(item)}
                    className="cursor-pointer"
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() => filters.setPage(Math.min(pagination.totalPages, filters.page + 1))}
                aria-disabled={filters.page >= pagination.totalPages}
                className={
                  filters.page >= pagination.totalPages
                    ? 'pointer-events-none opacity-50'
                    : 'cursor-pointer'
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
