import { Calendar, Layers } from 'lucide-react';
import type { SeriesListItem, SermonsConfig } from '../../types';
import { formatDate, seriesImageUrl } from '../../lib/format';
import { MediaCard } from '../ui/MediaCard';
import { ResultsEmpty } from '../ui/ResultsState';

interface SeriesGridProps {
  series: SeriesListItem[];
  viewMode?: 'grid' | 'list' | 'large';
  onSeriesClick: (id: number) => void;
  config: SermonsConfig;
}

const iconClass = 'inline h-3 w-3 shrink-0';

function DateLabel({ date }: { date: string }) {
  return (
    <span className="flex items-center gap-1">
      <Calendar className={iconClass} />
      {date}
    </span>
  );
}

function sermonCount(count: number) {
  return `${count} sermon${count !== 1 ? 's' : ''}`;
}

function SermonCountLabel({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-1">
      <Layers className={iconClass} />
      {sermonCount(count)}
    </span>
  );
}

export function SeriesGrid({ series, viewMode = 'grid', onSeriesClick, config }: SeriesGridProps) {
  if (series.length === 0) {
    return <ResultsEmpty noun="series" />;
  }

  // The compact list keeps its icon labels; the grid and large cards style
  // plain text in their ruled meta bands.
  const compact = viewMode === 'list';
  const wrapperClass =
    viewMode === 'list'
      ? 'divide-y divide-border'
      : viewMode === 'large'
        ? 'space-y-4'
        : 'grid grid-cols-1 gap-6 @[30rem]:grid-cols-2 @[48rem]:grid-cols-3';

  return (
    <div className={wrapperClass}>
      {series.map((s) => {
        const date = s.latestSermonDate ? formatDate(s.latestSermonDate) : undefined;
        return (
          <MediaCard
            key={s.id}
            viewMode={viewMode}
            imageUrl={seriesImageUrl(s.id, config.apiUrl)}
            imageAlt={s.displayTitle ?? s.title}
            title={s.displayTitle ?? s.title}
            description={s.subtitle}
            topLeft={date && compact ? <DateLabel date={date} /> : date}
            bottomLeft={
              compact ? <SermonCountLabel count={s.sermonCount} /> : sermonCount(s.sermonCount)
            }
            bottomRight={s.book ? `Book: ${s.book.name}` : undefined}
            onClick={() => onSeriesClick(s.id)}
          />
        );
      })}
    </div>
  );
}
