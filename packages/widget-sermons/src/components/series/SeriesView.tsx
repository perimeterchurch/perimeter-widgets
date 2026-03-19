import { useState } from 'react';
import { SearchInput, Skeleton } from '@perimeter-widgets/shared';
import { SkeletonTransition } from '@perimeter-widgets/shared/components/motion';
import type { SermonsConfig } from '../../types';
import { useSeries } from '../../hooks/use-series';
import { SeriesGrid } from './SeriesGrid';
import { SeriesDetail } from './SeriesDetail';
import type { useSermonFilters } from '../../hooks/use-sermon-filters';

interface SeriesViewProps {
    config: SermonsConfig;
    filters: ReturnType<typeof useSermonFilters>;
}

export function SeriesView({ config, filters }: SeriesViewProps) {
    const [search, setSearch] = useState('');
    const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(null);

    const { data: seriesList = [], isLoading } = useSeries(config);

    const filtered = search
        ? seriesList.filter((s) =>
              (s.displayTitle ?? s.title).toLowerCase().includes(search.toLowerCase()) ||
              (s.subtitle?.toLowerCase().includes(search.toLowerCase()) ?? false),
          )
        : seriesList;

    if (selectedSeriesId !== null) {
        return (
            <SeriesDetail
                id={selectedSeriesId}
                config={config}
                onBack={() => setSelectedSeriesId(null)}
                onSermonClick={(id) => filters.setScreen('detail', id)}
            />
        );
    }

    return (
        <div className="space-y-4">
            <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search series..."
                className="max-w-sm"
            />
            <SkeletonTransition
                isLoading={isLoading}
                skeleton={
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }, (_, i) => (
                            <Skeleton key={i} variant="card" className="h-32 w-full" />
                        ))}
                    </div>
                }
            >
                <SeriesGrid series={filtered} onSeriesClick={setSelectedSeriesId} />
            </SkeletonTransition>
        </div>
    );
}
