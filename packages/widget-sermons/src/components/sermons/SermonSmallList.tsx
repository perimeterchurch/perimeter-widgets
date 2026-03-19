import { Badge } from '@perimeter-widgets/shared';
import type { SermonListViewProps } from '../../types';
import { formatDate } from '../../lib/format';

export type { SermonListViewProps };

export function SermonSmallList({
    sermons,
    onSermonClick,
}: SermonListViewProps) {
    if (sermons.length === 0) {
        return (
            <div className='py-12 text-center text-stone-500 dark:text-stone-400'>
                No sermons found.
            </div>
        );
    }

    return (
        <div className='divide-y divide-stone-200 dark:divide-stone-700'>
            {sermons.map((sermon) => (
                <button
                    key={sermon.id}
                    type='button'
                    onClick={() => onSermonClick(sermon.id)}
                    className='flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded'
                >
                    {sermon.bannerUrl ?
                        <img
                            src={sermon.bannerUrl}
                            alt={sermon.title}
                            className='h-12 w-12 flex-shrink-0 rounded object-cover'
                        />
                    :   <div className='h-12 w-12 flex-shrink-0 rounded bg-gradient-to-br from-primary/80 to-primary' />
                    }
                    <div className='min-w-0 flex-1 space-y-0.5'>
                        <p className='truncate font-medium text-sm text-stone-900 dark:text-stone-100'>
                            {sermon.title}
                        </p>
                        <p className='text-xs text-stone-500 dark:text-stone-400'>
                            {sermon.speaker.name} · {formatDate(sermon.date)}
                        </p>
                        <Badge variant='secondary' size='sm'>
                            {sermon.series.title}
                        </Badge>
                    </div>
                </button>
            ))}
        </div>
    );
}
