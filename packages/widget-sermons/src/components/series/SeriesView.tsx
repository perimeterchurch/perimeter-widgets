import { useState, useMemo } from 'react';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
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
import type { SermonsConfig, SeriesListItem } from '../../types';
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
        label: 'Card Grid',
        icon: <LayoutGrid className='h-3.5 w-3.5' />,
    },
    {
        value: 'list',
        label: 'Small List',
        icon: <List className='h-3.5 w-3.5' />,
    },
    {
        value: 'large',
        label: 'Large Cards',
        icon: <Rows3 className='h-3.5 w-3.5' />,
    },
];

function sortSeries(
    series: SeriesListItem[],
    field: SeriesSortField,
    direction: 'asc' | 'desc',
): SeriesListItem[] {
    const sorted = [...series].sort((a, b) => {
        switch (field) {
            case 'date': {
                const dateA = a.latestSermonDate ?? '';
                const dateB = b.latestSermonDate ?? '';
                return dateA.localeCompare(dateB);
            }
            case 'title': {
                const titleA = (a.displayTitle ?? a.title).toLowerCase();
                const titleB = (b.displayTitle ?? b.title).toLowerCase();
                return titleA.localeCompare(titleB);
            }
            case 'count':
                return a.sermonCount - b.sermonCount;
        }
    });
    return direction === 'desc' ? sorted.reverse() : sorted;
}

export function SeriesView({ config, filters }: SeriesViewProps) {
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<SeriesViewMode>('grid');
    const [sortField, setSortField] = useState<SeriesSortField>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const { data: seriesList = [], isLoading } = useSeries(config);

    const filtered = useMemo(() => {
        const searched =
            search ?
                seriesList.filter(
                    (s) =>
                        (s.displayTitle ?? s.title)
                            .toLowerCase()
                            .includes(search.toLowerCase())
                        || (s.subtitle
                            ?.toLowerCase()
                            .includes(search.toLowerCase())
                            ?? false),
                )
            :   seriesList;
        return sortSeries(searched, sortField, sortDirection);
    }, [seriesList, search, sortField, sortDirection]);

    return (
        <div className='space-y-4'>
            {/* Row 1: Search */}
            <InputGroup>
                <InputGroupAddon align='inline-start'>
                    <Search />
                </InputGroupAddon>
                <InputGroupInput
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder='Search series...'
                />
            </InputGroup>

            {/* Results header: count + sort + view */}
            <div className='flex items-center justify-between'>
                <span className='text-sm text-[var(--color-text-muted)]'>
                    {filtered.length} series
                </span>
                <div className='flex items-center gap-2'>
                    <SortSelect
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSortFieldChange={(f) =>
                            setSortField(f as SeriesSortField)
                        }
                        onSortDirectionChange={setSortDirection}
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
                        {Array.from({ length: 6 }, (_, i) => (
                            <Skeleton
                                key={i}
                                className='h-32 w-full rounded-lg'
                            />
                        ))}
                    </div>
                }
            >
                <SeriesGrid
                    series={filtered}
                    viewMode={viewMode}
                    onSeriesClick={(id) => filters.setScreen('detail', id)}
                />
            </SkeletonTransition>
        </div>
    );
}
