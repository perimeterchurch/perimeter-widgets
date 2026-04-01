import { useState } from 'react';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
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
import { SkeletonTransition } from '@perimeter-widgets/shared/components/motion';
import {
    Search,
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
import { SeriesGrid } from './SeriesGrid';
import type { useSermonFilters } from '../../hooks/use-sermon-filters';

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

export function SeriesView({ config, filters }: SeriesViewProps) {
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<SeriesViewMode>('grid');
    const [sortField, setSortField] = useState<SeriesSortField>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);

    const { data, isLoading } = useSeries({
        search: search || undefined,
        page,
        perPage: config.perPage,
        sort: sortField,
        order: sortDirection,
        config,
    });

    const seriesList = data?.series ?? [];
    const pagination = data?.pagination;

    return (
        <div className='space-y-4'>
            {/* Row 1: Search */}
            <InputGroup>
                <InputGroupAddon align='inline-start'>
                    <Search />
                </InputGroupAddon>
                <InputGroupInput
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    placeholder='Search series...'
                />
            </InputGroup>

            {/* Results header: count + sort + view */}
            <div className='flex items-center justify-between'>
                <span className='text-sm text-[var(--color-text-muted)]'>
                    {pagination ? `${pagination.total} series` : ''}
                </span>
                <div className='flex items-center gap-2'>
                    <SortSelect
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSortFieldChange={(f) => {
                            setSortField(f as SeriesSortField);
                            setPage(1);
                        }}
                        onSortDirectionChange={(d) => {
                            setSortDirection(d);
                            setPage(1);
                        }}
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
                                onClick={() => setPage(Math.max(1, page - 1))}
                                aria-disabled={page <= 1}
                                className={
                                    page <= 1 ?
                                        'pointer-events-none opacity-50'
                                    :   'cursor-pointer'
                                }
                            />
                        </PaginationItem>
                        {getPageRange(page, pagination.totalPages).map(
                            (item, idx) =>
                                item === 'ellipsis' ?
                                    <PaginationItem key={`e-${idx}`}>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                :   <PaginationItem key={item}>
                                        <PaginationLink
                                            isActive={item === page}
                                            onClick={() => setPage(item)}
                                            className='cursor-pointer'
                                        >
                                            {item}
                                        </PaginationLink>
                                    </PaginationItem>,
                        )}
                        <PaginationItem>
                            <PaginationNext
                                onClick={() =>
                                    setPage(
                                        Math.min(
                                            pagination.totalPages,
                                            page + 1,
                                        ),
                                    )
                                }
                                aria-disabled={page >= pagination.totalPages}
                                className={
                                    page >= pagination.totalPages ?
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
