import { useState } from 'react';
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
import { IconSelect } from '@perimeter/ui/icon-select';
import { SortSelect } from '@perimeter/ui/sort-select';
import { SkeletonTransition } from '@perimeter/ui/skeleton-transition';
import { Calendar, Type, LayoutGrid, Eye, List, Rows3 } from 'lucide-react';
import { useSermons } from '@perimeter/api-hooks';
import type { SermonsConfig, ViewMode, SortField, SortOrder } from '../../types';
import { useSermonFacets } from '../../hooks/use-sermon-facets';
import { useFilterLabelCache } from '../../hooks/use-filter-label-cache';
import { SermonFilters } from './SermonFilters';
import { SermonGrid } from './SermonGrid';
import { SermonSmallList } from './SermonSmallList';
import { SermonLargeList } from './SermonLargeList';
import type { useSermonFilters } from '../../hooks/use-sermon-filters';
import { getPageRange } from '../../lib/pagination';
import { defined, idsParam } from '../../lib/query-params';

interface SermonsViewProps {
  config: SermonsConfig;
  filters: ReturnType<typeof useSermonFilters>;
}

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
];

export function SermonsView({ config, filters }: SermonsViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(config.defaultView ?? 'grid');
  const labelCache = useFilterLabelCache();

  // Both type filters are opt-in. The embedder shows them by setting
  // data-show-service-type / data-show-series-type. When pinned via
  // serviceTypeId / seriesTypeId, the dropdown stays hidden (the value
  // is locked). The schema transform also pins seriesTypeId="1" by
  // default — see SermonsConfigSchema.
  const showServiceTypeFilter = config.showServiceType === true && !config.serviceTypeId;
  const showSeriesTypeFilter = config.showSeriesType === true && !config.seriesTypeId;

  const display = config.display ?? 'full';
  const showFilters = display === 'full';
  const showSortView = display !== 'headless';

  // Config-pinned series type (e.g. the "Sunday Morning Sermon" default)
  // narrows every sermon query as a baseline.
  const pinnedSeriesTypeId = config.seriesTypeId || undefined;

  const { data, isLoading } = useSermons(
    defined({
      search: filters.search || undefined,
      seriesId: idsParam(filters.selectedSeriesIds),
      speakerId: idsParam(filters.selectedSpeakerIds),
      bookId: idsParam(filters.selectedBookIds),
      serviceTypeId: idsParam(filters.selectedServiceTypeIds),
      seriesTypeId: idsParam(filters.selectedSeriesTypeIds) ?? pinnedSeriesTypeId,
      from: filters.from ?? undefined,
      to: filters.to ?? undefined,
      // Sermons sort only over date/title; the shared SortField also carries
      // 'count' (series-only), which isn't a valid sermon sort — fall back to date.
      sort: filters.sort === 'count' ? 'date' : filters.sort,
      order: filters.order,
      page: filters.page,
      perPage: config.perPage,
    }),
  );

  const facets = useSermonFacets({ config, filters, labelCache });

  const sermons = data?.data.sermons ?? [];
  const pagination = data?.data.pagination;

  const handleSortFieldChange = (field: string) => {
    filters.setSort(field as SortField, filters.order);
  };
  const handleSortDirectionChange = (direction: SortOrder) => {
    filters.setSort(filters.sort, direction);
  };

  const ViewComponent =
    viewMode === 'list' ? SermonSmallList : viewMode === 'large' ? SermonLargeList : SermonGrid;

  return (
    <div className="space-y-4">
      {showFilters && (
        <SermonFilters
          search={filters.search}
          selectedSeriesIds={filters.selectedSeriesIds}
          selectedSpeakerIds={filters.selectedSpeakerIds}
          selectedBookIds={filters.selectedBookIds}
          selectedServiceTypeIds={filters.selectedServiceTypeIds}
          selectedSeriesTypeIds={filters.selectedSeriesTypeIds}
          from={filters.from ?? ''}
          to={filters.to ?? ''}
          sort={filters.sort}
          order={filters.order}
          hasActiveFilters={filters.hasActiveFilters}
          seriesList={facets.series}
          speakers={facets.speakers}
          books={facets.books}
          serviceTypes={facets.serviceTypes}
          seriesTypes={facets.seriesTypes}
          labelCache={labelCache}
          showServiceTypeFilter={showServiceTypeFilter}
          showSeriesTypeFilter={showSeriesTypeFilter}
          seriesLoading={facets.seriesLoading}
          speakersLoading={facets.speakersLoading}
          booksLoading={facets.booksLoading}
          serviceTypesLoading={facets.serviceTypesLoading}
          seriesTypesLoading={facets.seriesTypesLoading}
          onSearchChange={filters.setSearch}
          onSeriesChange={filters.setSeriesIds}
          onSpeakerChange={filters.setSpeakerIds}
          onBookChange={filters.setBookIds}
          onServiceTypesChange={filters.setServiceTypes}
          onSeriesTypeChange={filters.setSeriesTypeIds}
          onDateRangeChange={filters.setDateRange}
          onSortChange={filters.setSort}
          onClearFilters={filters.clearFilters}
          lockedFilters={filters.lockedFilters}
        />
      )}
      {/* Results header: count + sort + view */}
      {showSortView && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--color-muted-fg)]">
            {pagination ? `${pagination.total} sermons` : ''}
          </span>
          <div className="flex items-center gap-2">
            <SortSelect
              sortField={filters.sort}
              sortDirection={filters.order}
              onSortFieldChange={handleSortFieldChange}
              onSortDirectionChange={handleSortDirectionChange}
              fields={SORT_FIELDS}
            />
            <IconSelect
              value={viewMode}
              onChange={(v: string) => setViewMode(v as ViewMode)}
              options={VIEW_OPTIONS}
              label="View:"
              icon={<Eye className="h-3.5 w-3.5 shrink-0" />}
            />
          </div>
        </div>
      )}
      <SkeletonTransition
        isLoading={isLoading}
        skeleton={
          <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2 @lg:grid-cols-3">
            {Array.from({ length: config.perPage }, (_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        }
      >
        <ViewComponent
          sermons={sermons}
          onSermonClick={(id: number) => filters.setScreen('detail', id)}
          config={config}
        />
      </SkeletonTransition>
      {!config.hidePagination && pagination && pagination.totalPages > 1 && (
        <Pagination aria-label="Sermon results pagination">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => filters.setPage(Math.max(1, pagination.page - 1))}
                aria-disabled={pagination.page <= 1}
                className={
                  pagination.page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                }
              />
            </PaginationItem>
            {getPageRange(pagination.page, pagination.totalPages).map((item, idx) =>
              item === 'ellipsis' ? (
                <PaginationItem key={`e-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationLink
                    isActive={item === pagination.page}
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
                onClick={() =>
                  filters.setPage(Math.min(pagination.totalPages, pagination.page + 1))
                }
                aria-disabled={pagination.page >= pagination.totalPages}
                className={
                  pagination.page >= pagination.totalPages
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
