import { useState } from 'react';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    Skeleton,
} from '@perimeter-widgets/shared';
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
            <InputGroup className='max-w-sm'>
                <InputGroupAddon align='inline-start'>
                    <Search />
                </InputGroupAddon>
                <InputGroupInput
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder='Search series...'
                />
            </InputGroup>
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
