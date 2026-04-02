import { useState } from 'react';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    Button,
    MultiCombobox,
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationPrevious,
    PaginationNext,
    PaginationEllipsis,
    Skeleton,
    SortSelect,
    IconSelect,
} from '@perimeter-widgets/shared';
import type { MultiComboboxOption } from '@perimeter-widgets/shared';
import { SkeletonTransition } from '@perimeter-widgets/shared/components/motion';
import {
    Search,
    X,
    Calendar,
    Type,
    Hash,
    LayoutGrid,
    Eye,
    List,
    Rows3,
} from 'lucide-react';
import type { SermonsConfig } from '../../types';
import { useSeries } from '../../hooks/use-series';
import { useSeriesTypes } from '../../hooks/use-series-types';
import { DateRangePicker } from '../ui/DateRangePicker';
import { SeriesGrid } from './SeriesGrid';
import type { useSermonFilters } from '../../hooks/use-sermon-filters';
import { getPageRange } from '../../lib/pagination';

interface SeriesViewProps {
    config: SermonsConfig;
    filters: ReturnType<typeof useSermonFilters>;
}

type SeriesViewMode = 'grid' | 'list' | 'large';
type SeriesSortField = 'date' | 'title' | 'count';

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
    {
        value: 'count',
        label: 'Sermon Count',
        icon: <Hash className='h-3.5 w-3.5' />,
    },
];

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

export function SeriesView({ config, filters }: SeriesViewProps) {
    const [viewMode, setViewMode] = useState<SeriesViewMode>('grid');
    const display = config.display ?? 'full';
    const showSearch = display === 'full';
    const showSortView = display !== 'headless';
    const showSeriesTypeFilter =
        display === 'full' && !config.seriesTypeId && !config.hideSeriesType;

    const { data: seriesTypes = [], isLoading: seriesTypesLoading } =
        useSeriesTypes(config);
    const seriesTypeOptions: MultiComboboxOption[] = seriesTypes.map((st) => ({
        value: String(st.id),
        label: st.name,
    }));

    const { data, isLoading } = useSeries({
        search: filters.search || undefined,
        selectedSeriesTypeIds: filters.selectedSeriesTypeIds,
        from: filters.from ?? undefined,
        to: filters.to ?? undefined,
        page: filters.page,
        perPage: config.perPage,
        sort: filters.sort,
        order: filters.order,
        config,
    });

    const seriesList = data?.series ?? [];
    const pagination = data?.pagination;

    return (
        <div className='space-y-4'>
            {/* Row 1: Search */}
            {showSearch && (
                <InputGroup>
                    <InputGroupAddon align='inline-start'>
                        <Search />
                    </InputGroupAddon>
                    <InputGroupInput
                        value={filters.search}
                        onChange={(e) => filters.setSearch(e.target.value)}
                        placeholder='Search series...'
                    />
                </InputGroup>
            )}

            {/* Row 2: Series Type filter */}
            {showSeriesTypeFilter && (
                <div className='flex items-center gap-2'>
                    <MultiCombobox
                        options={seriesTypeOptions}
                        value={filters.selectedSeriesTypeIds.map(String)}
                        onValueChange={(v) =>
                            filters.setSeriesTypeIds(v.map(Number))
                        }
                        placeholder='All Series Types'
                        selectedLabel='Series Types'
                        disabled={seriesTypesLoading}
                        className='flex-1'
                        multiple
                    />
                </div>
            )}

            {/* Row 3: Date range + clear all */}
            {showSearch && (
                <div className='flex items-center gap-3'>
                    <DateRangePicker
                        from={filters.from ?? ''}
                        to={filters.to ?? ''}
                        onFromChange={(v) =>
                            filters.setDateRange(v, filters.to)
                        }
                        onToChange={(v) =>
                            filters.setDateRange(filters.from, v)
                        }
                    />
                    <div className='flex-1' />
                    {filters.hasActiveFilters && (
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={filters.clearFilters}
                        >
                            <X className='h-3.5 w-3.5' />
                            Clear All
                        </Button>
                    )}
                </div>
            )}

            {/* Results header: count + sort + view */}
            {showSortView && (
                <div className='flex items-center justify-between'>
                    <span className='text-sm text-[var(--color-text-muted)]'>
                        {pagination ? `${pagination.total} series` : ''}
                    </span>
                    <div className='flex items-center gap-2'>
                        <SortSelect
                            sortField={filters.sort}
                            sortDirection={filters.order}
                            onSortFieldChange={(field) =>
                                filters.setSort(
                                    field as SeriesSortField,
                                    filters.order,
                                )
                            }
                            onSortDirectionChange={(direction) =>
                                filters.setSort(filters.sort, direction)
                            }
                            fields={SORT_FIELDS}
                        />
                        <IconSelect
                            value={viewMode}
                            onChange={(v) => setViewMode(v as SeriesViewMode)}
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
                <SeriesGrid
                    series={seriesList}
                    viewMode={viewMode}
                    onSeriesClick={(id) => filters.setScreen('detail', id)}
                />
            </SkeletonTransition>

            {pagination && pagination.totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() =>
                                    filters.setPage(
                                        Math.max(1, filters.page - 1),
                                    )
                                }
                                aria-disabled={filters.page <= 1}
                                className={
                                    filters.page <= 1 ?
                                        'pointer-events-none opacity-50'
                                    :   'cursor-pointer'
                                }
                            />
                        </PaginationItem>
                        {getPageRange(filters.page, pagination.totalPages).map(
                            (item, idx) =>
                                item === 'ellipsis' ?
                                    <PaginationItem key={`e-${idx}`}>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                :   <PaginationItem key={item}>
                                        <PaginationLink
                                            isActive={item === filters.page}
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
                                            filters.page + 1,
                                        ),
                                    )
                                }
                                aria-disabled={
                                    filters.page >= pagination.totalPages
                                }
                                className={
                                    filters.page >= pagination.totalPages ?
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
