import { Badge } from '@perimeter-widgets/shared';
import type { SermonListViewProps } from '../../types';
import { formatDate, sermonImageUrl } from '../../lib/format';
import { MediaCard } from '../ui/MediaCard';

export type { SermonListViewProps };

export function SermonLargeCards({
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
        <div className='space-y-4'>
            {sermons.map((sermon) => (
                <MediaCard
                    key={sermon.id}
                    viewMode='large'
                    imageUrl={sermon.bannerUrl ?? sermonImageUrl(sermon.id)}
                    imageAlt={sermon.title}
                    title={sermon.title}
                    subtitle={sermon.speaker.name}
                    description={sermon.shortDescription}
                    badges={
                        <Badge variant='secondary'>{sermon.series.title}</Badge>
                    }
                    meta={
                        <span className='text-xs text-muted-foreground'>
                            {formatDate(sermon.date)}
                        </span>
                    }
                    onClick={() => onSermonClick(sermon.id)}
                />
            ))}
        </div>
    );
}
