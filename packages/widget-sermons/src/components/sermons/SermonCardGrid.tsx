import { DateTime } from 'luxon';
import { Badge } from '@perimeter-widgets/shared';
import type { SermonListItem } from '../../types';

export interface SermonListViewProps {
    sermons: SermonListItem[];
    onSermonClick: (id: number) => void;
}

function formatDate(iso: string): string {
    return DateTime.fromISO(iso).toLocaleString(DateTime.DATE_MED);
}

export function SermonCardGrid({
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
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {sermons.map((sermon) => (
                <button
                    key={sermon.id}
                    type='button'
                    onClick={() => onSermonClick(sermon.id)}
                    className='overflow-hidden rounded-lg border border-stone-200 dark:border-stone-700 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
                >
                    {sermon.bannerUrl ?
                        <img
                            src={sermon.bannerUrl}
                            alt={sermon.title}
                            className='h-40 w-full object-cover'
                        />
                    :   <div className='h-40 w-full bg-gradient-to-br from-primary/80 to-primary' />
                    }
                    <div className='p-3 space-y-1'>
                        <p className='font-semibold text-sm leading-snug text-stone-900 dark:text-stone-100 line-clamp-2'>
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
