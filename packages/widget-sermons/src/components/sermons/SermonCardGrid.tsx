import { Badge } from '@perimeter-widgets/shared';
import type { SermonListViewProps } from '../../types';
import { formatDate, sermonImageUrl } from '../../lib/format';
import { MediaCard } from '../ui/MediaCard';

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
                    subtitle={`${sermon.speaker.name} · ${formatDate(sermon.date)}`}
                    description={sermon.shortDescription}
                    badges={
                        <Badge variant='secondary'>{sermon.series.title}</Badge>
                    }
                    onClick={() => onSermonClick(sermon.id)}
                />
            ))}
        </div>
    );
}
