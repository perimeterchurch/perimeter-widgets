import { Calendar, Layers, BookOpen } from 'lucide-react';
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

function SermonCountLabel({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-1">
      <Layers className={iconClass} />
      {count} sermon{count !== 1 ? 's' : ''}
    </span>
  );
}

function BookLabel({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-1">
      <BookOpen className={iconClass} />
      {name}
    </span>
  );
}

export function SeriesGrid({ series, viewMode = 'grid', onSeriesClick, config }: SeriesGridProps) {
  if (series.length === 0) {
    return <ResultsEmpty noun="series" />;
  }

  const wrapperClass =
    viewMode === 'list'
      ? 'divide-y divide-border'
      : viewMode === 'large'
        ? 'space-y-4'
        : 'grid grid-cols-1 gap-4 @[30rem]:grid-cols-2 @[48rem]:grid-cols-3';

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
          topLeft={
            s.latestSermonDate ? <DateLabel date={formatDate(s.latestSermonDate)} /> : undefined
          }
          bottomLeft={<SermonCountLabel count={s.sermonCount} />}
          bottomRight={s.book ? <BookLabel name={s.book.name} /> : undefined}
          onClick={() => onSeriesClick(s.id)}
        />
      ))}
    </div>
  );
}
