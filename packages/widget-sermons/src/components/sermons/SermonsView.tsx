import { useState } from 'react';
import { Pagination, IconSelect, Skeleton } from '@perimeter-widgets/shared';
import type { IconSelectOption } from '@perimeter-widgets/shared';
import { SkeletonTransition } from '@perimeter-widgets/shared/components/motion';
import {
    LayoutGrid,
    List,
    Rows3,
    ArrowDownWideNarrow,
    ArrowUpNarrowWide,
    ArrowDownAZ,
    ArrowUpZA,
} from 'lucide-react';
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
import { SermonFilters } from './SermonFilters';
import { SermonCardGrid } from './SermonCardGrid';
import { SermonSmallList } from './SermonSmallList';
import { SermonLargeCards } from './SermonLargeCards';
import type { useSermonFilters } from '../../hooks/use-sermon-filters';

interface SermonsViewProps {
    config: SermonsConfig;
    filters: ReturnType<typeof useSermonFilters>;
}

const VIEW_OPTIONS: IconSelectOption<string>[] = [
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

const SORT_OPTIONS: IconSelectOption<string>[] = [
    {
        value: 'date-desc',
        label: 'Date: Newest',
        icon: <ArrowDownWideNarrow className='h-4 w-4' />,
    },
    {
        value: 'date-asc',
        label: 'Date: Oldest',
        icon: <ArrowUpNarrowWide className='h-4 w-4' />,
    },
    {
        value: 'title-asc',
        label: 'Title: A-Z',
        icon: <ArrowDownAZ className='h-4 w-4' />,
    },
    {
        value: 'title-desc',
        label: 'Title: Z-A',
        icon: <ArrowUpZA className='h-4 w-4' />,
    },
];

export function SermonsView({ config, filters }: SermonsViewProps) {
    const [viewMode, setViewMode] = useState<ViewMode>(
        config.defaultView ?? 'grid',
    );
    const { data, isLoading } = useSermons({ ...filters, config });
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
                from={filters.from ?? ''}
                to={filters.to ?? ''}
                sort={filters.sort}
                order={filters.order}
                hasActiveFilters={filters.hasActiveFilters}
                seriesList={seriesList}
                speakers={speakers}
                books={books}
                seriesLoading={seriesLoading}
                speakersLoading={speakersLoading}
                booksLoading={booksLoading}
                onSearchChange={filters.setSearch}
                onSeriesChange={filters.setSeries}
                onSpeakerChange={filters.setSpeaker}
                onBookChange={filters.setBook}
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
                    <IconSelect
                        value={sortValue}
                        onChange={handleSortChange}
                        options={SORT_OPTIONS}
                    />
                    <IconSelect
                        value={viewMode}
                        onChange={(v) => setViewMode(v as ViewMode)}
                        options={VIEW_OPTIONS}
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
                                variant='card'
                                className='h-48 w-full'
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
                <Pagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    onChange={filters.setPage}
                />
            )}
        </div>
    );
}
