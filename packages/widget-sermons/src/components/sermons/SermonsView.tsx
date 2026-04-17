import { useEffect, useMemo, useState } from 'react';
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
import { applyWidgetDefaults } from '../../types';
import { useSermons } from '../../hooks/use-sermons';
import { useSeries } from '../../hooks/use-series';
import { useSpeakers } from '../../hooks/use-speakers';
import { useBooks } from '../../hooks/use-books';
import { useServiceTypes } from '../../hooks/use-service-types';
import { useSeriesTypes } from '../../hooks/use-series-types';
import { useFilterLabelCache } from '../../hooks/use-filter-label-cache';
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

export function SermonsView({ config: rawConfig, filters }: SermonsViewProps) {
    const config = applyWidgetDefaults(rawConfig);
    const [viewMode, setViewMode] = useState<ViewMode>(
        config.defaultView ?? 'grid',
    );
    const labelCache = useFilterLabelCache();

    // --- Unfiltered primer fetches: populate the label cache so selected
    // options survive even when the narrowed facet lists exclude them.
    const { data: allSpeakers = [] } = useSpeakers({ config });
    const { data: allBooks = [] } = useBooks({ config });
    const { data: allServiceTypes = [] } = useServiceTypes({ config });
    const { data: allSeriesTypes = [] } = useSeriesTypes({ config });
    const { data: allSeriesPage } = useSeries({ config, perPage: 50 });
    const allSeriesItems = useMemo(
        () => allSeriesPage?.series ?? [],
        [allSeriesPage?.series],
    );

    // Absorb primer results into the label cache via effects — inline absorb
    // would fire twice under React StrictMode's double-render.
    useEffect(() => {
        labelCache.absorb(
            'speaker',
            allSpeakers.map((s) => ({ id: s.id, label: s.name })),
        );
    }, [allSpeakers, labelCache]);
    useEffect(() => {
        labelCache.absorb(
            'book',
            allBooks.map((b) => ({ id: b.id, label: b.name })),
        );
    }, [allBooks, labelCache]);
    useEffect(() => {
        labelCache.absorb(
            'series',
            allSeriesItems.map((s) => ({
                id: s.id,
                label: s.displayTitle ?? s.title,
            })),
        );
    }, [allSeriesItems, labelCache]);
    useEffect(() => {
        labelCache.absorb(
            'serviceType',
            allServiceTypes.map((s) => ({ id: s.id, label: s.name })),
        );
    }, [allServiceTypes, labelCache]);
    useEffect(() => {
        labelCache.absorb(
            'seriesType',
            allSeriesTypes.map((s) => ({ id: s.id, label: s.name })),
        );
    }, [allSeriesTypes, labelCache]);

    // Both type filters are opt-in. The embedder shows them by setting
    // data-show-service-type / data-show-series-type. When pinned via
    // serviceTypeId / seriesTypeId, the dropdown stays hidden (the value
    // is locked). The schema transform also pins seriesTypeId="1" by
    // default — see SermonsConfigSchema.
    const showServiceTypeFilter =
        config.showServiceType === true && !config.serviceTypeId;
    const showSeriesTypeFilter =
        config.showSeriesType === true && !config.seriesTypeId;

    const display = config.display ?? 'full';
    const showFilters = display === 'full';
    const showSortView = display !== 'headless';

    const lockedFilters = new Set<string>();
    if (config.seriesId || config.hideSeries) lockedFilters.add('series');
    if (config.speakerId || config.hideSpeaker) lockedFilters.add('speaker');
    if (config.bookId || config.hideBook) lockedFilters.add('book');
    if (config.serviceTypeId || config.hideServiceType)
        lockedFilters.add('serviceTypes');
    if (config.seriesTypeId || config.hideSeriesType)
        lockedFilters.add('seriesType');
    if (config.from || config.hideDate) lockedFilters.add('from');
    if (config.to || config.hideDate) lockedFilters.add('to');
    if (config.hideSearch) lockedFilters.add('search');

    const { data, isLoading } = useSermons({
        search: filters.search || undefined,
        selectedSeriesIds: filters.selectedSeriesIds,
        selectedSpeakerIds: filters.selectedSpeakerIds,
        selectedBookIds: filters.selectedBookIds,
        selectedServiceTypeIds: filters.selectedServiceTypeIds,
        selectedSeriesTypeIds: filters.selectedSeriesTypeIds,
        from: filters.from,
        to: filters.to,
        sort: filters.sort,
        order: filters.order,
        page: filters.page,
        config,
    });

    // --- Narrowed facet fetches: the lists rendered in the filter dropdowns,
    // scoped by the currently-selected filters from every other dimension.
    const { data: narrowedSpeakers = [], isLoading: speakersLoading } =
        useSpeakers({
            config,
            search: filters.search || undefined,
            selectedSeriesIds: filters.selectedSeriesIds,
            selectedBookIds: filters.selectedBookIds,
            selectedServiceTypeIds: filters.selectedServiceTypeIds,
            selectedSeriesTypeIds: filters.selectedSeriesTypeIds,
            from: filters.from ?? undefined,
            to: filters.to ?? undefined,
        });
    const { data: narrowedBooks = [], isLoading: booksLoading } = useBooks({
        config,
        search: filters.search || undefined,
        selectedSeriesIds: filters.selectedSeriesIds,
        selectedSpeakerIds: filters.selectedSpeakerIds,
        selectedServiceTypeIds: filters.selectedServiceTypeIds,
        selectedSeriesTypeIds: filters.selectedSeriesTypeIds,
        from: filters.from ?? undefined,
        to: filters.to ?? undefined,
    });
    const { data: narrowedServiceTypes = [], isLoading: serviceTypesLoading } =
        useServiceTypes({
            config,
            search: filters.search || undefined,
            selectedSeriesIds: filters.selectedSeriesIds,
            selectedSpeakerIds: filters.selectedSpeakerIds,
            selectedBookIds: filters.selectedBookIds,
            selectedSeriesTypeIds: filters.selectedSeriesTypeIds,
            from: filters.from ?? undefined,
            to: filters.to ?? undefined,
        });
    const { data: narrowedSeriesTypes = [], isLoading: seriesTypesLoading } =
        useSeriesTypes({
            config,
            search: filters.search || undefined,
            selectedSeriesIds: filters.selectedSeriesIds,
            selectedSpeakerIds: filters.selectedSpeakerIds,
            selectedBookIds: filters.selectedBookIds,
            selectedServiceTypeIds: filters.selectedServiceTypeIds,
            from: filters.from ?? undefined,
            to: filters.to ?? undefined,
        });
    const { data: narrowedSeriesPage, isLoading: seriesLoading } = useSeries({
        config,
        perPage: 50,
        search: filters.search || undefined,
        selectedSpeakerIds: filters.selectedSpeakerIds,
        selectedBookIds: filters.selectedBookIds,
        selectedServiceTypeIds: filters.selectedServiceTypeIds,
        selectedSeriesTypeIds: filters.selectedSeriesTypeIds,
        from: filters.from ?? undefined,
        to: filters.to ?? undefined,
    });
    const narrowedSeries = narrowedSeriesPage?.series ?? [];

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
                    selectedSeriesTypeIds={filters.selectedSeriesTypeIds}
                    from={filters.from ?? ''}
                    to={filters.to ?? ''}
                    sort={filters.sort}
                    order={filters.order}
                    hasActiveFilters={filters.hasActiveFilters}
                    seriesList={narrowedSeries}
                    speakers={narrowedSpeakers}
                    books={narrowedBooks}
                    serviceTypes={narrowedServiceTypes}
                    seriesTypes={narrowedSeriesTypes}
                    labelCache={labelCache}
                    showServiceTypeFilter={showServiceTypeFilter}
                    showSeriesTypeFilter={showSeriesTypeFilter}
                    seriesLoading={seriesLoading}
                    speakersLoading={speakersLoading}
                    booksLoading={booksLoading}
                    serviceTypesLoading={serviceTypesLoading}
                    seriesTypesLoading={seriesTypesLoading}
                    onSearchChange={filters.setSearch}
                    onSeriesChange={filters.setSeriesIds}
                    onSpeakerChange={filters.setSpeakerIds}
                    onBookChange={filters.setBookIds}
                    onServiceTypesChange={filters.setServiceTypes}
                    onSeriesTypeChange={filters.setSeriesTypeIds}
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
            {!config.hidePagination
                && pagination
                && pagination.totalPages > 1 && (
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
                                            onClick={() =>
                                                filters.setPage(item)
                                            }
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
                                        (
                                            pagination.page
                                            >= pagination.totalPages
                                        ) ?
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
