import { useState } from 'react';
import { Input, Skeleton } from '@perimeter-widgets/shared';
import { SkeletonTransition } from '@perimeter-widgets/shared/components/motion';
import { Search } from 'lucide-react';
import type { SermonsConfig } from '../../types';
import { useSeries } from '../../hooks/use-series';
import { SeriesGrid } from './SeriesGrid';
import type { useSermonFilters } from '../../hooks/use-sermon-filters';

interface SeriesViewProps {
    config: SermonsConfig;
    filters: ReturnType<typeof useSermonFilters>;
}

export function SeriesView({ config, filters }: SeriesViewProps) {
    const [search, setSearch] = useState('');

    const { data: seriesList = [], isLoading } = useSeries(config);

    const filtered =
        search ?
            seriesList.filter(
                (s) =>
                    (s.displayTitle ?? s.title)
                        .toLowerCase()
                        .includes(search.toLowerCase())
                    || (s.subtitle?.toLowerCase().includes(search.toLowerCase())
                        ?? false),
            )
        :   seriesList;

    return (
        <div className='space-y-4'>
            <div className='relative max-w-sm'>
                <Search className='pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder='Search series...'
                    className='pl-9'
                />
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
                    onSeriesClick={(id) => filters.setScreen('detail', id)}
                />
            </SkeletonTransition>
        </div>
    );
}
