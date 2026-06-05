import * as React from 'react';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SermonsConfig } from './types';
import { applyWidgetDefaults } from './types';
import { useSermonFilters } from './hooks/use-sermon-filters';
import { SermonTabs } from './components/SermonTabs';
import { SermonsView } from './components/sermons/SermonsView';
import { SermonDetail } from './components/sermons/SermonDetail';
import { SeriesView } from './components/series/SeriesView';
import { SeriesDetail } from './components/series/SeriesDetail';

const fadeSlide = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] as const },
  },
};

// Stable URL-param prefix. nuqs v2's adapter has no global prefix option, so
// `useSermonFilters` namespaces every query-state key as `<NUQS_PREFIX><key>`.
// A static prefix keeps bookmarkable URLs working across reloads; the
// trade-off is that two sermons widgets on the same page would share params.
// That is acceptable because there is no real-world use case for two sermons
// instances on one page — a separate widget type would be created for any
// "hero sermon" or "related sermons" embed.
const NUQS_PREFIX = 'sermons-';

interface SermonsWidgetProps {
  config: SermonsConfig;
}

function SermonsWidget({ config }: SermonsWidgetProps): React.JSX.Element {
  const filters = useSermonFilters(config, { prefix: NUQS_PREFIX });

  // Build a unique key for AnimatePresence based on the current "page"
  const viewKey =
    filters.screen === 'detail' && filters.id
      ? `detail-${filters.tab}-${filters.id}`
      : `browse-${filters.tab}`;

  // Determine which content to render
  const renderContent = () => {
    if (filters.screen === 'detail' && filters.id) {
      // Viewing a series detail
      if (filters.tab === 'series' && !filters.fromSeriesId) {
        return (
          <SeriesDetail
            id={filters.id}
            config={config}
            onBack={() => filters.setScreen('browse')}
            onSermonClick={(sermonId) => {
              // Navigate to sermon detail, remembering which series we came from
              filters.setSermonFromSeries(sermonId, filters.id!);
            }}
          />
        );
      }
      // Viewing a sermon detail
      return (
        <SermonDetail
          id={filters.id}
          config={config}
          onBack={() => {
            if (filters.fromSeriesId) {
              filters.setSeriesDetail(filters.fromSeriesId);
            } else {
              filters.setScreen('browse');
            }
          }}
          onSermonClick={(sermonId) => filters.setScreen('detail', sermonId)}
        />
      );
    }

    const showTabs = !config.tab && (config.display ?? 'full') !== 'headless';

    return (
      <>
        {showTabs && <SermonTabs activeTab={filters.tab} onTabChange={filters.setTab} />}
        <div className={showTabs ? 'mt-4' : ''}>
          <AnimatePresence mode="wait">
            <motion.div key={filters.tab} {...fadeSlide}>
              {filters.tab === 'sermons' && <SermonsView config={config} filters={filters} />}
              {filters.tab === 'series' && <SeriesView config={config} filters={filters} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </>
    );
  };

  return (
    <div className="@container p-4">
      <AnimatePresence mode="wait">
        <motion.div key={viewKey} {...fadeSlide}>
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export interface AppProps {
  config: SermonsConfig;
}

export function App({ config: rawConfig }: AppProps): React.JSX.Element {
  const config = applyWidgetDefaults(rawConfig);
  return (
    <NuqsAdapter>
      <SermonsWidget config={config} />
    </NuqsAdapter>
  );
}
