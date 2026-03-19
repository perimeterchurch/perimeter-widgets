import { DateTime } from 'luxon';
import { Badge } from '@perimeter-widgets/shared';
import type { SeriesListItem } from '../../types';

interface SeriesGridProps {
    series: SeriesListItem[];
    onSeriesClick: (id: number) => void;
}

function formatDate(iso: string): string {
    return DateTime.fromISO(iso).toLocaleString(DateTime.DATE_MED);
}

export function SeriesGrid({ series, onSeriesClick }: SeriesGridProps) {
    if (series.length === 0) {
        return (
            <div className='py-12 text-center text-stone-500 dark:text-stone-400'>
                No series found.
            </div>
        );
    }

    return (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {series.map((s) => (
                <button
                    key={s.id}
                    type='button'
                    onClick={() => onSeriesClick(s.id)}
                    className='rounded-lg border border-stone-200 dark:border-stone-700 p-4 text-left space-y-2 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
                >
                    <div className='space-y-0.5'>
                        <p className='font-semibold text-sm leading-snug text-stone-900 dark:text-stone-100 line-clamp-2'>
                            {s.displayTitle ?? s.title}
                        </p>
                        {s.subtitle && (
                            <p className='text-xs text-stone-500 dark:text-stone-400 line-clamp-1'>
                                {s.subtitle}
                            </p>
                        )}
                    </div>
                    <div className='flex flex-wrap items-center gap-1.5'>
                        <span className='text-xs text-stone-400'>
                            {s.sermonCount} sermon
                            {s.sermonCount !== 1 ? 's' : ''}
                        </span>
                        {s.latestSermonDate && (
                            <span className='text-xs text-stone-400'>
                                · {formatDate(s.latestSermonDate)}
                            </span>
                        )}
                    </div>
                    {s.book && (
                        <Badge variant='secondary' size='sm'>
                            {s.book.name}
                        </Badge>
                    )}
                </button>
            ))}
        </div>
    );
}
