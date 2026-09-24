import type { SermonListViewProps, SermonsConfig } from '../../types';
import { sermonImageUrl } from '../../lib/format';
import { MediaCard } from '../ui/MediaCard';
import { ResultsEmpty } from '../ui/ResultsState';
import { sermonCardMeta } from './SermonInfo';

export type { SermonListViewProps };

interface SermonListProps extends SermonListViewProps {
  config: SermonsConfig;
}

export function SermonList({
  sermons,
  onSermonClick,
  onSeriesClick,
  onSpeakerClick,
  config,
}: SermonListProps) {
  if (sermons.length === 0) {
    return <ResultsEmpty noun="sermons" />;
  }

  return (
    <div className="space-y-4">
      {sermons.map((sermon) => (
        <MediaCard
          key={sermon.id}
          viewMode="list"
          imageUrl={sermon.bannerUrl ?? sermonImageUrl(sermon.id, config.apiUrl)}
          imageAlt={sermon.title}
          title={sermon.title}
          description={sermon.shortDescription}
          {...sermonCardMeta(sermon, { onSeriesClick, onSpeakerClick })}
          onClick={() => onSermonClick(sermon.id)}
        />
      ))}
    </div>
  );
}
