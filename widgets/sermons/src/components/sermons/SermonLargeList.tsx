import { formatDate, useConfig } from '@perimeter-widgets/shared';
import type { SermonListViewProps, SermonsConfig } from '../../types';
import { sermonImageUrl } from '../../lib/format';
import { MediaCard } from '../ui/MediaCard';
import { DateLabel, SeriesPill, SpeakerLabel, BookLabel } from './SermonInfo';

export type { SermonListViewProps };

export function SermonLargeList({
    sermons,
    onSermonClick,
}: SermonListViewProps) {
    const config = useConfig<SermonsConfig>();
    if (sermons.length === 0) {
        return (
            <div className='py-12 text-center text-muted-foreground'>
                No sermons found.
            </div>
        );
    }

    return (
        <div className='space-y-4'>
            {sermons.map((sermon) => (
                <MediaCard
                    key={sermon.id}
                    viewMode='large'
                    imageUrl={
                        sermon.bannerUrl
                        ?? sermonImageUrl(sermon.id, config.apiUrl)
                    }
                    imageAlt={sermon.title}
                    title={sermon.title}
                    description={sermon.shortDescription}
                    topLeft={<DateLabel date={formatDate(sermon.date)} />}
                    topRight={<SeriesPill name={sermon.series.title} />}
                    bottomLeft={<SpeakerLabel name={sermon.speaker.name} />}
                    bottomRight={
                        sermon.book?.name ?
                            <BookLabel name={sermon.book.name} />
                        :   undefined
                    }
                    onClick={() => onSermonClick(sermon.id)}
                />
            ))}
        </div>
    );
}
