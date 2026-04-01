import { Calendar, Library, User, BookOpen } from 'lucide-react';
import type { SermonListViewProps } from '../../types';
import { formatDate, sermonImageUrl } from '../../lib/format';
import { MediaCard } from '../ui/MediaCard';

export type { SermonListViewProps };

const icon = 'inline h-3 w-3 shrink-0';

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
                    topLeft={
                        <span className='flex items-center gap-1'>
                            <Calendar className={icon} />
                            {formatDate(sermon.date)}
                        </span>
                    }
                    topRight={
                        <span className='flex items-center gap-1'>
                            <Library className={icon} />
                            {sermon.series.title}
                        </span>
                    }
                    bottomLeft={
                        <span className='flex items-center gap-1'>
                            <User className={icon} />
                            {sermon.speaker.name}
                        </span>
                    }
                    bottomRight={
                        sermon.book?.name ?
                            <span className='flex items-center gap-1'>
                                <BookOpen className={icon} />
                                {sermon.book.name}
                            </span>
                        :   undefined
                    }
                    onClick={() => onSermonClick(sermon.id)}
                />
            ))}
        </div>
    );
}
