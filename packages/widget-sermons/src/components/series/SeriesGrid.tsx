import { Badge } from '@perimeter-widgets/shared';
import type { SeriesListItem } from '../../types';
import { formatDate, seriesImageUrl } from '../../lib/format';
import { ImagePlaceholder } from '../ui/ImagePlaceholder';

interface SeriesGridProps {
    series: SeriesListItem[];
    onSeriesClick: (id: number) => void;
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
                    className='overflow-hidden rounded-lg border border-stone-200 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:border-stone-700 dark:hover:border-stone-500'
                >
                    <img
                        src={seriesImageUrl(s.id)}
                        alt={s.displayTitle ?? s.title}
                        className='aspect-video w-full object-cover'
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                                'none';
                            (
                                e.target as HTMLImageElement
                            ).nextElementSibling?.classList.remove('hidden');
                        }}
                    />
                    <ImagePlaceholder className='hidden aspect-video w-full' />
                    <div className='p-3 space-y-2'>
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
                            <Badge variant='secondary'>{s.book.name}</Badge>
                        )}
                    </div>
                </button>
            ))}
        </div>
    );
}
