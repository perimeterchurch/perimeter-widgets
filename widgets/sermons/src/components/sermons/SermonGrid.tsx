import type { SermonListViewProps, SermonsConfig } from '../../types';
import { sermonImageUrl } from '../../lib/format';
import { MediaCard } from '../ui/MediaCard';
import { ResultsEmpty } from '../ui/ResultsState';
import { sermonCardMeta } from './SermonInfo';

export type { SermonListViewProps };

interface SermonGridProps extends SermonListViewProps {
  config: SermonsConfig;
}

export function SermonGrid({
  sermons,
  onSermonClick,
  onSeriesClick,
  onSpeakerClick,
  config,
}: SermonGridProps) {
  if (sermons.length === 0) {
    return <ResultsEmpty noun="sermons" />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 @[30rem]:grid-cols-2 @[48rem]:grid-cols-3">
      {sermons.map((sermon) => (
        <MediaCard
          key={sermon.id}
          viewMode="grid"
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
