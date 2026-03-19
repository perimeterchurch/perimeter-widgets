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

export function SermonLargeCards({ sermons, onSermonClick }: SermonListViewProps) {
    if (sermons.length === 0) {
        return (
            <div className="py-12 text-center text-stone-500 dark:text-stone-400">
                No sermons found.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {sermons.map((sermon) => (
                <button
                    key={sermon.id}
                    type="button"
                    onClick={() => onSermonClick(sermon.id)}
                    className="flex w-full overflow-hidden rounded-lg border border-stone-200 dark:border-stone-700 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                    {sermon.bannerUrl ? (
                        <img
                            src={sermon.bannerUrl}
                            alt={sermon.title}
                            className="h-auto w-44 flex-shrink-0 object-cover"
                            style={{ minHeight: '120px' }}
                        />
                    ) : (
                        <div className="w-44 flex-shrink-0 bg-gradient-to-br from-primary/80 to-primary" style={{ minHeight: '120px' }} />
                    )}
                    <div className="flex flex-1 flex-col justify-between p-4 space-y-2">
                        <div className="space-y-1">
                            <p className="font-semibold text-base leading-snug text-stone-900 dark:text-stone-100 line-clamp-2">
                                {sermon.title}
                            </p>
                            <p className="text-sm text-stone-500 dark:text-stone-400">
                                {sermon.speaker.name}
                            </p>
                            {sermon.shortDescription && (
                                <p className="text-sm text-stone-600 dark:text-stone-300 line-clamp-2">
                                    {sermon.shortDescription}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" size="sm">{sermon.series.title}</Badge>
                            <span className="text-xs text-stone-400">{formatDate(sermon.date)}</span>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}
