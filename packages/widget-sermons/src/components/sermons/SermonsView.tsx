import { useState } from 'react';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationPrevious,
    PaginationNext,
    PaginationEllipsis,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Skeleton,
} from '@perimeter-widgets/shared';
import { SkeletonTransition } from '@perimeter-widgets/shared/components/motion';
import { LayoutGrid, List, Rows3 } from 'lucide-react';
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
import { SermonCardGrid } from './SermonCardGrid';
import { SermonSmallList } from './SermonSmallList';
import { SermonLargeCards } from './SermonLargeCards';
import type { useSermonFilters } from '../../hooks/use-sermon-filters';

interface SermonsViewProps {
    config: SermonsConfig;
    filters: ReturnType<typeof useSermonFilters>;
}

const VIEW_OPTIONS = [
    {
        value: 'grid',
        label: 'Card Grid',
        icon: <LayoutGrid className='h-4 w-4' />,
    },
    {
        value: 'list',
        label: 'Small List',
        icon: <List className='h-4 w-4' />,
    },
    {
        value: 'large',
        label: 'Large Cards',
        icon: <Rows3 className='h-4 w-4' />,
    },
];

const SORT_OPTIONS = [
    { value: 'date-desc', label: 'Date: Newest' },
    { value: 'date-asc', label: 'Date: Oldest' },
    { value: 'title-asc', label: 'Title: A-Z' },
    { value: 'title-desc', label: 'Title: Z-A' },
];

/** Build a page range for the pagination component */
function getPageRange(
    page: number,
    totalPages: number,
): (number | 'ellipsis')[] {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
        return pages;
    }
    pages.push(1);
    if (page > 3) pages.push('ellipsis');
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
    return pages;
}

export function SermonsView({ config, filters }: SermonsViewProps) {
    const [viewMode, setViewMode] = useState<ViewMode>(
        config.defaultView ?? 'grid',
    );
    const { data: serviceTypes = [], isLoading: serviceTypesLoading } =
        useServiceTypes(config);
    const configServiceTypeIds = resolveServiceTypeIds(
        config.serviceTypes,
        serviceTypes,
    );
    const showServiceTypeFilter = !config.serviceTypes;

    const { data, isLoading } = useSermons({
        ...filters,
        config,
        serviceTypeId: configServiceTypeIds,
    });
    const { data: seriesList = [], isLoading: seriesLoading } =
        useSeries(config);
    const { data: speakers = [], isLoading: speakersLoading } =
        useSpeakers(config);
    const { data: books = [], isLoading: booksLoading } = useBooks(config);

    const sermons = data?.sermons ?? [];
    const pagination = data?.pagination;

    const sortValue = `${filters.sort}-${filters.order}`;
    const handleSortChange = (value: string) => {
        const [sort, order] = value.split('-') as [SortField, SortOrder];
        filters.setSort(sort, order);
    };

    const ViewComponent =
        viewMode === 'list' ? SermonSmallList
        : viewMode === 'large' ? SermonLargeCards
        : SermonCardGrid;

    return (
        <div className='space-y-4'>
            <SermonFilters
                search={filters.search}
                series={filters.series}
                speaker={filters.speaker}
                book={filters.book}
                serviceType={filters.serviceType}
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
                onSeriesChange={filters.setSeries}
                onSpeakerChange={filters.setSpeaker}
                onBookChange={filters.setBook}
                onServiceTypeChange={filters.setServiceType}
                onDateRangeChange={filters.setDateRange}
                onSortChange={filters.setSort}
                onClearFilters={filters.clearFilters}
            />
            {/* Results header: count + sort + view */}
            <div className='flex items-center justify-between'>
                <span className='text-sm text-[var(--color-text-muted)]'>
                    {pagination ? `${pagination.total} sermons` : ''}
                </span>
                <div className='flex items-center gap-2'>
                    <Select
                        value={sortValue}
                        onValueChange={(v) => v && handleSortChange(v)}
                    >
                        <SelectTrigger size='sm'>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent align='start' alignItemWithTrigger={false}>
                            {SORT_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={viewMode}
                        onValueChange={(v) => v && setViewMode(v as ViewMode)}
                    >
                        <SelectTrigger size='sm'>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent align='start' alignItemWithTrigger={false}>
                            {VIEW_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    <span className='flex items-center gap-1.5'>
                                        {opt.icon} {opt.label}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
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
