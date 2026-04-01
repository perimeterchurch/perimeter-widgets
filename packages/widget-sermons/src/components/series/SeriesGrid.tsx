import { Badge } from '@perimeter-widgets/shared';
import type { SeriesListItem } from '../../types';
import { formatDate, seriesImageUrl } from '../../lib/format';
import { ImagePlaceholder } from '../ui/ImagePlaceholder';

interface SeriesGridProps {
    series: SeriesListItem[];
    viewMode?: 'grid' | 'list' | 'large';
    onSeriesClick: (id: number) => void;
}

function SeriesImage({
    series,
    className,
}: {
    series: SeriesListItem;
    className?: string;
}) {
    return (
        <>
            <img
                src={seriesImageUrl(series.id)}
                alt={series.displayTitle ?? series.title}
                className={className}
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (
                        e.target as HTMLImageElement
                    ).nextElementSibling?.classList.remove('hidden');
                }}
            />
            <ImagePlaceholder className={`hidden ${className ?? ''}`} />
        </>
    );
}

function SeriesMeta({ series }: { series: SeriesListItem }) {
    return (
        <div className='flex flex-wrap items-center gap-1.5'>
            <span className='text-xs text-stone-400'>
                {series.sermonCount} sermon
                {series.sermonCount !== 1 ? 's' : ''}
            </span>
            {series.latestSermonDate && (
                <span className='text-xs text-stone-400'>
                    · {formatDate(series.latestSermonDate)}
                </span>
            )}
        </div>
    );
}

const CARD_CLASS =
    'overflow-hidden rounded-lg border border-stone-200 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:border-stone-700 dark:hover:border-stone-500';

const LIST_CLASS =
    'flex w-full items-center gap-3 rounded-md px-2 py-3 text-left transition-all duration-200 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:hover:bg-stone-800/50';

const LARGE_CLASS =
    'flex w-full overflow-hidden rounded-lg border border-stone-200 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:border-stone-700 dark:hover:border-stone-500';

export function SeriesGrid({
    series,
    viewMode = 'grid',
    onSeriesClick,
}: SeriesGridProps) {
    if (series.length === 0) {
        return (
            <div className='py-12 text-center text-stone-500 dark:text-stone-400'>
                No series found.
            </div>
        );
    }

    if (viewMode === 'list') {
        return (
            <div className='divide-y divide-stone-100 dark:divide-stone-800'>
                {series.map((s) => (
                    <button
                        key={s.id}
                        type='button'
                        onClick={() => onSeriesClick(s.id)}
                        className={LIST_CLASS}
                    >
                        <SeriesImage
                            series={s}
                            className='h-12 w-12 flex-shrink-0 rounded object-cover'
                        />
                        <div className='min-w-0 flex-1'>
                            <p className='text-sm font-semibold leading-snug text-stone-900 dark:text-stone-100 truncate'>
                                {s.displayTitle ?? s.title}
                            </p>
                            <SeriesMeta series={s} />
                        </div>
                        {s.book && (
                            <Badge variant='secondary'>{s.book.name}</Badge>
                        )}
                    </button>
                ))}
            </div>
        );
    }

    if (viewMode === 'large') {
        return (
            <div className='space-y-3'>
                {series.map((s) => (
                    <button
                        key={s.id}
                        type='button'
                        onClick={() => onSeriesClick(s.id)}
                        className={LARGE_CLASS}
                    >
                        <SeriesImage
                            series={s}
                            className='h-auto w-44 flex-shrink-0 object-cover'
                        />
                        <div className='flex-1 p-4 space-y-2'>
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
                            <SeriesMeta series={s} />
                            {s.book && (
                                <Badge variant='secondary'>{s.book.name}</Badge>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        );
    }

    // Grid view (default)
    return (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {series.map((s) => (
                <button
                    key={s.id}
                    type='button'
                    onClick={() => onSeriesClick(s.id)}
                    className={CARD_CLASS}
                >
                    <SeriesImage
                        series={s}
                        className='aspect-video w-full object-cover'
                    />
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
                        <SeriesMeta series={s} />
                        {s.book && (
                            <Badge variant='secondary'>{s.book.name}</Badge>
                        )}
                    </div>
                </button>
            ))}
        </div>
    );
}
