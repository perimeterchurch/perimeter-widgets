import { Badge } from '@perimeter-widgets/shared';
import type { SermonListViewProps } from '../../types';
import { formatDate, sermonImageUrl } from '../../lib/format';
import { MediaCard } from '../ui/MediaCard';

export type { SermonListViewProps };

export function SermonSmallList({
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
        <div className='divide-y divide-border'>
            {sermons.map((sermon) => (
                <MediaCard
                    key={sermon.id}
                    viewMode='list'
                    imageUrl={sermon.bannerUrl ?? sermonImageUrl(sermon.id)}
                    imageAlt={sermon.title}
                    title={sermon.title}
                    subtitle={`${sermon.speaker.name} · ${formatDate(sermon.date)}`}
                    badges={
                        <Badge variant='secondary'>{sermon.series.title}</Badge>
                    }
                    onClick={() => onSermonClick(sermon.id)}
                />
            ))}
        </div>
    );
}
