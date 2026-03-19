import { DateTime } from 'luxon';
import { ArrowLeft } from 'lucide-react';
import { Badge, EmptyState, Skeleton } from '@perimeter-widgets/shared';
import { SkeletonTransition } from '@perimeter-widgets/shared/components/motion';
import type { SermonsConfig } from '../../types';
import { useSeriesDetail } from '../../hooks/use-series-detail';

interface SeriesDetailProps {
    id: number;
    config: SermonsConfig;
    onBack: () => void;
    onSermonClick: (id: number) => void;
}

function formatDate(iso: string): string {
    return DateTime.fromISO(iso).toLocaleString(DateTime.DATE_MED);
}

export function SeriesDetail({ id, config, onBack, onSermonClick }: SeriesDetailProps) {
    const { data: series, isLoading, error } = useSeriesDetail(id, config);

    if (error) {
        return (
            <div>
                <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-primary mb-4"><ArrowLeft className="h-4 w-4" /> Back</button>
                <EmptyState title="Series not found" description="This series may have been removed or is unavailable." />
            </div>
        );
    }

    return (
        <div>
            <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-primary mb-4"><ArrowLeft className="h-4 w-4" /> Back to series</button>
            <SkeletonTransition
                isLoading={isLoading}
                skeleton={
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-2/3" />
                        <Skeleton className="h-4 w-1/3" />
                        <div className="space-y-2">
                            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    </div>
                }
            >
                {series && (
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                                {series.displayTitle ?? series.title}
                            </h2>
                            {series.subtitle && (
                                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">{series.subtitle}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className="text-sm text-stone-500">
                                    {series.sermonCount} sermon{series.sermonCount !== 1 ? 's' : ''}
                                </span>
                                {series.book && <Badge variant="secondary" size="sm">{series.book.name}</Badge>}
                            </div>
                            {series.description && (
                                <p className="text-sm text-stone-600 dark:text-stone-300 mt-2">{series.description}</p>
                            )}
                        </div>

                        <div className="divide-y divide-stone-200 dark:divide-stone-700">
                            {series.sermons.map((sermon, index) => (
                                <button
                                    key={sermon.id}
                                    type="button"
                                    onClick={() => onSermonClick(sermon.id)}
                                    className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded px-1"
                                >
                                    <span className="flex-shrink-0 w-6 text-center text-xs font-medium text-stone-400">
                                        {index + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-sm text-stone-900 dark:text-stone-100">
                                            {sermon.title}
                                        </p>
                                        <p className="text-xs text-stone-500 dark:text-stone-400">
                                            {sermon.speaker.name} · {formatDate(sermon.date)}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </SkeletonTransition>
        </div>
    );
}
