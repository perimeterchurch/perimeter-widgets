import { Badge } from '@perimeter-widgets/shared';
import type { SermonListViewProps } from '../../types';
import { formatDate, sermonImageUrl } from '../../lib/format';
import { ImagePlaceholder } from '../ui/ImagePlaceholder';

export type { SermonListViewProps };

export function SermonLargeCards({
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
        <div className='space-y-4'>
            {sermons.map((sermon) => (
                <button
                    key={sermon.id}
                    type='button'
                    onClick={() => onSermonClick(sermon.id)}
                    className='flex w-full overflow-hidden rounded-lg border border-stone-200 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:border-stone-700 dark:hover:border-stone-500'
                >
                    <img
                        src={sermon.bannerUrl ?? sermonImageUrl(sermon.id)}
                        alt={sermon.title}
                        className='h-auto w-44 flex-shrink-0 object-cover'
                        style={{ minHeight: '120px' }}
                        onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = 'none';
                            img.nextElementSibling?.classList.remove('hidden');
                        }}
                    />
                    <ImagePlaceholder
                        className='hidden w-44 flex-shrink-0'
                        style={{ minHeight: '120px' }}
                    />
                    <div className='flex flex-1 flex-col justify-between p-4 space-y-2'>
                        <div className='space-y-1'>
                            <p className='font-semibold text-base leading-snug text-stone-900 dark:text-stone-100 line-clamp-2'>
                                {sermon.title}
                            </p>
                            <p className='text-sm text-stone-500 dark:text-stone-400'>
                                {sermon.speaker.name}
                            </p>
                            {sermon.shortDescription && (
                                <p className='text-sm text-stone-600 dark:text-stone-300 line-clamp-2'>
                                    {sermon.shortDescription}
                                </p>
                            )}
                        </div>
                        <div className='flex items-center gap-2'>
                            <Badge variant='secondary'>
                                {sermon.series.title}
                            </Badge>
                            <span className='text-xs text-stone-400'>
                                {formatDate(sermon.date)}
                            </span>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}
