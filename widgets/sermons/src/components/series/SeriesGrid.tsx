import type { SeriesListItem, SermonsConfig, ViewMode } from '../../types';
import { formatDate, seriesImageUrl } from '../../lib/format';
import { MediaCard } from '../ui/MediaCard';
import { ResultsEmpty } from '../ui/ResultsState';

interface SeriesGridProps {
  series: SeriesListItem[];
  viewMode?: ViewMode;
  onSeriesClick: (id: number) => void;
  config: SermonsConfig;
}

function sermonCount(count: number) {
  return `${count} sermon${count !== 1 ? 's' : ''}`;
}

export function SeriesGrid({ series, viewMode = 'grid', onSeriesClick, config }: SeriesGridProps) {
  if (series.length === 0) {
    return <ResultsEmpty noun="series" />;
  }

  const wrapperClass =
    viewMode === 'list'
      ? 'space-y-4'
      : 'grid grid-cols-1 gap-6 @[30rem]:grid-cols-2 @[48rem]:grid-cols-3';

  return (
    <div className={wrapperClass}>
      {series.map((s) => (
        <MediaCard
          key={s.id}
          viewMode={viewMode}
          imageUrl={seriesImageUrl(s.id, config.apiUrl)}
          imageAlt={s.displayTitle ?? s.title}
          title={s.displayTitle ?? s.title}
          description={s.subtitle}
          topLeft={s.latestSermonDate ? formatDate(s.latestSermonDate) : undefined}
          bottomLeft={sermonCount(s.sermonCount)}
          bottomRight={s.book ? `Book: ${s.book.name}` : undefined}
          onClick={() => onSeriesClick(s.id)}
        />
      ))}
    </div>
  );
}
