import type { SermonListViewProps } from '../../types';
import { formatDate, sermonImageUrl } from '../../lib/format';
import { MediaCard } from '../ui/MediaCard';
import { DatePill, SeriesPill, SpeakerPill, BookPill } from './SermonInfo';

export type { SermonListViewProps };

export function SermonCardGrid({
    sermons,
    onSermonClick,
}: SermonListViewProps) {
    if (sermons.length === 0) {
        return (
            <div className='py-12 text-center text-muted-foreground'>
                No sermons found.
            </div>
        );
    }

    return (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {sermons.map((sermon) => (
                <MediaCard
                    key={sermon.id}
                    viewMode='grid'
                    imageUrl={sermon.bannerUrl ?? sermonImageUrl(sermon.id)}
                    imageAlt={sermon.title}
                    title={sermon.title}
                    description={sermon.shortDescription}
                    topLeft={<DatePill date={formatDate(sermon.date)} />}
                    topRight={<SeriesPill name={sermon.series.title} />}
                    bottomLeft={<SpeakerPill name={sermon.speaker.name} />}
                    bottomRight={
                        sermon.book?.name ?
                            <BookPill name={sermon.book.name} />
                        :   undefined
                    }
                    onClick={() => onSermonClick(sermon.id)}
                />
            ))}
        </div>
    );
}
