import { useConfig } from '@perimeter-widgets/shared';
import { NuqsAdapter } from 'nuqs/adapters/react';
import type { SermonsConfig } from './types';
import { useSermonFilters } from './hooks/use-sermon-filters';
import { SermonTabs } from './components/SermonTabs';
import { SermonsView } from './components/sermons/SermonsView';
import { SermonDetail } from './components/sermons/SermonDetail';
import { SeriesView } from './components/series/SeriesView';
import { SeriesDetail } from './components/series/SeriesDetail';

function SermonsWidget() {
    const config = useConfig<SermonsConfig>();
    const filters = useSermonFilters();

    if (filters.screen === 'detail' && filters.id) {
        if (filters.tab === 'series') {
            return (
                <div className='p-4'>
                    <SeriesDetail
                        id={filters.id}
                        config={config}
                        onBack={() => filters.setScreen('browse')}
                        onSermonClick={(id) => {
                            filters.setScreen('detail', id);
                        }}
                    />
                </div>
            );
        }
        return (
            <div className='p-4'>
                <SermonDetail
                    id={filters.id}
                    config={config}
                    onBack={() => filters.setScreen('browse')}
                />
            </div>
        );
    }

    return (
        <div className='p-4'>
            <SermonTabs activeTab={filters.tab} onTabChange={filters.setTab} />
            <div className='mt-4'>
                {filters.tab === 'sermons' && (
                    <SermonsView config={config} filters={filters} />
                )}
                {filters.tab === 'series' && (
                    <SeriesView config={config} filters={filters} />
                )}
            </div>
        </div>
    );
}

export function SermonsApp() {
    return (
        <NuqsAdapter>
            <SermonsWidget />
        </NuqsAdapter>
    );
}
