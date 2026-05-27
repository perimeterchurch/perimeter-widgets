import type { SermonListViewProps, SermonsConfig } from '../../types';
import { formatDate, sermonImageUrl } from '../../lib/format';
import { MediaCard } from '../ui/MediaCard';
import { DateLabel, SeriesPill, SpeakerLabel, BookLabel } from './SermonInfo';

export type { SermonListViewProps };

interface SermonSmallListProps extends SermonListViewProps {
  config: SermonsConfig;
}

export function SermonSmallList({ sermons, onSermonClick, config }: SermonSmallListProps) {
  if (sermons.length === 0) {
    return <div className="py-12 text-center text-muted-fg">No sermons found.</div>;
  }

  return (
    <div>
      {sermons.map((sermon) => (
        <MediaCard
          key={sermon.id}
          viewMode="list"
          imageUrl={sermon.bannerUrl ?? sermonImageUrl(sermon.id, config.apiUrl)}
          imageAlt={sermon.title}
          title={sermon.title}
          description={sermon.shortDescription}
          topLeft={<DateLabel date={formatDate(sermon.date)} />}
          topRight={<SeriesPill name={sermon.series.title} />}
          bottomLeft={<SpeakerLabel name={sermon.speaker.name} />}
          bottomRight={sermon.book?.name ? <BookLabel name={sermon.book.name} /> : undefined}
          onClick={() => onSermonClick(sermon.id)}
        />
      ))}
    </div>
  );
}
