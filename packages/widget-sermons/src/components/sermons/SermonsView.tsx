import { useState } from 'react';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationPrevious,
    PaginationNext,
    PaginationEllipsis,
    Skeleton,
    IconSelect,
    SortSelect,
} from '@perimeter-widgets/shared';
import { SkeletonTransition } from '@perimeter-widgets/shared/components/motion';
import { Calendar, Type, LayoutGrid, Eye, List, Rows3 } from 'lucide-react';
import type {
    SermonsConfig,
    ViewMode,
    SortField,
    SortOrder,
} from '../../types';
import { useSermons } from '../../hooks/use-sermons';
import { useSeries } from '../../hooks/use-series';
import { useSpeakers } from '../../hooks/use-speakers';
import { useBooks } from '../../hooks/use-books';
import { useServiceTypes } from '../../hooks/use-service-types';
import { resolveServiceTypeIds } from '../../types';
import { SermonFilters } from './SermonFilters';
import { SermonGrid } from './SermonGrid';
import { SermonSmallList } from './SermonSmallList';
import { SermonLargeList } from './SermonLargeList';
import type { useSermonFilters } from '../../hooks/use-sermon-filters';
import { getPageRange } from '../../lib/pagination';

interface SermonsViewProps {
    config: SermonsConfig;
    filters: ReturnType<typeof useSermonFilters>;
}

const VIEW_OPTIONS = [
    {
        value: 'grid',
        label: 'Grid',
        icon: <LayoutGrid className='h-3.5 w-3.5' />,
    },
    {
        value: 'list',
        label: 'Small List',
        icon: <List className='h-3.5 w-3.5' />,
    },
    {
        value: 'large',
        label: 'Large List',
        icon: <Rows3 className='h-3.5 w-3.5' />,
    },
];

const SORT_FIELDS = [
    {
        value: 'date',
        label: 'Date',
        icon: <Calendar className='h-3.5 w-3.5' />,
    },
    {
        value: 'title',
        label: 'Title',
        icon: <Type className='h-3.5 w-3.5' />,
    },
];

export function SermonsView({ config, filters }: SermonsViewProps) {
    const [viewMode, setViewMode] = useState<ViewMode>(
        config.defaultView ?? 'grid',
    );
    const { data: serviceTypes = [], isLoading: serviceTypesLoading } =
        useServiceTypes(config);
    const showServiceTypeFilter = !config.serviceTypes && !config.serviceTypeId;

    const resolvedServiceTypeId =
        config.serviceTypeId
        ?? (filters.selectedServiceTypeIds.length > 0 ?
            filters.selectedServiceTypeIds.join(',')
        :   (resolveServiceTypeIds(config.serviceTypes, serviceTypes)
            ?? undefined));

    const display = config.display ?? 'full';
    const showFilters = display === 'full';
    const showSortView = display !== 'headless';

    const lockedFilters = new Set<string>();
    if (config.seriesId || config.hideSeries) lockedFilters.add('series');
    if (config.speakerId || config.hideSpeaker) lockedFilters.add('speaker');
    if (config.bookId || config.hideBook) lockedFilters.add('book');
    if (config.serviceTypeId || config.hideServiceType)
        lockedFilters.add('serviceTypes');
    if (config.from || config.hideDate) lockedFilters.add('from');
    if (config.to || config.hideDate) lockedFilters.add('to');
    if (config.hideSearch) lockedFilters.add('search');

    const { data, isLoading } = useSermons({
        search: filters.search || undefined,
        selectedSeriesIds: filters.selectedSeriesIds,
        selectedSpeakerIds: filters.selectedSpeakerIds,
        selectedBookIds: filters.selectedBookIds,
        selectedServiceTypeIds: filters.selectedServiceTypeIds,
        from: filters.from,
        to: filters.to,
        sort: filters.sort,
        order: filters.order,
        page: filters.page,
        config,
        serviceTypeId: resolvedServiceTypeId,
    });
    const { data: seriesData, isLoading: seriesLoading } = useSeries({
        config,
        perPage: 50,
    });
    const seriesList = seriesData?.series ?? [];
    const { data: speakers = [], isLoading: speakersLoading } =
        useSpeakers(config);
    const { data: books = [], isLoading: booksLoading } = useBooks(config);

    const sermons = data?.sermons ?? [];
    const pagination = data?.pagination;

    const handleSortFieldChange = (field: string) => {
        filters.setSort(field as SortField, filters.order);
    };
    const handleSortDirectionChange = (direction: 'asc' | 'desc') => {
        filters.setSort(filters.sort, direction as SortOrder);
    };

    const ViewComponent =
        viewMode === 'list' ? SermonSmallList
        : viewMode === 'large' ? SermonLargeList
        : SermonGrid;

    return (
        <div className='space-y-4'>
            {showFilters && (
                <SermonFilters
                    search={filters.search}
                    selectedSeriesIds={filters.selectedSeriesIds}
                    selectedSpeakerIds={filters.selectedSpeakerIds}
                    selectedBookIds={filters.selectedBookIds}
                    selectedServiceTypeIds={filters.selectedServiceTypeIds}
                    from={filters.from ?? ''}
                    to={filters.to ?? ''}
                    sort={filters.sort}
                    order={filters.order}
                    hasActiveFilters={filters.hasActiveFilters}
                    seriesList={seriesList}
                    speakers={speakers}
                    books={books}
                    serviceTypes={serviceTypes}
                    showServiceTypeFilter={showServiceTypeFilter}
                    seriesLoading={seriesLoading}
                    speakersLoading={speakersLoading}
                    booksLoading={booksLoading}
                    serviceTypesLoading={serviceTypesLoading}
                    onSearchChange={filters.setSearch}
                    onSeriesChange={filters.setSeriesIds}
                    onSpeakerChange={filters.setSpeakerIds}
                    onBookChange={filters.setBookIds}
                    onServiceTypesChange={filters.setServiceTypes}
                    onDateRangeChange={filters.setDateRange}
                    onSortChange={filters.setSort}
                    onClearFilters={filters.clearFilters}
                    lockedFilters={lockedFilters}
                />
            )}
            {/* Results header: count + sort + view */}
            {showSortView && (
                <div className='flex items-center justify-between'>
                    <span className='text-sm text-[var(--color-text-muted)]'>
                        {pagination ? `${pagination.total} sermons` : ''}
                    </span>
                    <div className='flex items-center gap-2'>
                        <SortSelect
                            sortField={filters.sort}
                            sortDirection={filters.order}
                            onSortFieldChange={handleSortFieldChange}
                            onSortDirectionChange={handleSortDirectionChange}
                            fields={SORT_FIELDS}
                        />
                        <IconSelect
                            value={viewMode}
                            onChange={(v) => setViewMode(v as ViewMode)}
                            options={VIEW_OPTIONS}
                            label='View:'
                            icon={<Eye className='h-3.5 w-3.5 shrink-0' />}
                        />
                    </div>
                </div>
            )}
            <SkeletonTransition
                isLoading={isLoading}
                skeleton={
                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                        {Array.from({ length: config.perPage }, (_, i) => (
                            <Skeleton
                                key={i}
                                className='h-48 w-full rounded-lg'
                            />
                        ))}
                    </div>
                }
            >
                <ViewComponent
                    sermons={sermons}
                    onSermonClick={(id) => filters.setScreen('detail', id)}
                />
            </SkeletonTransition>
            {pagination && pagination.totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() =>
                                    filters.setPage(
                                        Math.max(1, pagination.page - 1),
                                    )
                                }
                                aria-disabled={pagination.page <= 1}
                                className={
                                    pagination.page <= 1 ?
                                        'pointer-events-none opacity-50'
                                    :   'cursor-pointer'
                                }
                            />
                        </PaginationItem>
                        {getPageRange(
                            pagination.page,
                            pagination.totalPages,
                        ).map((item, idx) =>
                            item === 'ellipsis' ?
                                <PaginationItem key={`e-${idx}`}>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            :   <PaginationItem key={item}>
                                    <PaginationLink
                                        isActive={item === pagination.page}
                                        onClick={() => filters.setPage(item)}
                                        className='cursor-pointer'
                                    >
                                        {item}
                                    </PaginationLink>
                                </PaginationItem>,
                        )}
                        <PaginationItem>
                            <PaginationNext
                                onClick={() =>
                                    filters.setPage(
                                        Math.min(
                                            pagination.totalPages,
                                            pagination.page + 1,
                                        ),
                                    )
                                }
                                aria-disabled={
                                    pagination.page >= pagination.totalPages
                                }
                                className={
                                    pagination.page >= pagination.totalPages ?
                                        'pointer-events-none opacity-50'
                                    :   'cursor-pointer'
                                }
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    );
}
