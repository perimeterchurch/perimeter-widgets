import { useConfig } from '@perimeter-widgets/shared';
import { NuqsAdapter } from 'nuqs/adapters/react';
import type { SermonsConfig, TabId } from './types';
import { useSermonFilters } from './hooks/use-sermon-filters';
import { SermonTabs } from './components/SermonTabs';
import { SermonsView } from './components/sermons/SermonsView';
import { SermonDetail } from './components/sermons/SermonDetail';
import { SeriesView } from './components/series/SeriesView';
import { ComingSoon } from './components/compilations/ComingSoon';

function SermonsWidget() {
    const config = useConfig<SermonsConfig>();
    const filters = useSermonFilters();
    const activeTab = filters.tab as TabId;

    if (filters.screen === 'detail' && filters.id) {
        return (
            <div className="p-4">
                <SermonDetail id={filters.id} config={config} onBack={() => filters.setScreen('browse')} />
            </div>
        );
    }

    return (
        <div className="p-4">
            <SermonTabs activeTab={activeTab} onTabChange={filters.setTab} />
            <div className="mt-4">
                {activeTab === 'sermons' && <SermonsView config={config} filters={filters} />}
                {activeTab === 'series' && <SeriesView config={config} filters={filters} />}
                {activeTab === 'compilations' && <ComingSoon />}
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
