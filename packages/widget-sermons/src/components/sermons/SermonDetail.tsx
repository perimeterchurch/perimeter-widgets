import { useState } from 'react';
import DOMPurify from 'dompurify';
import { DateTime } from 'luxon';
import { ArrowLeft, Calendar, Type } from 'lucide-react';
import {
    Button,
    Empty,
    EmptyHeader,
    EmptyTitle,
    EmptyDescription,
    Skeleton,
    SortSelect,
} from '@perimeter-widgets/shared';
import { SkeletonTransition } from '@perimeter-widgets/shared/components/motion';
import type { SermonsConfig, SortField, SortOrder } from '../../types';
import { useSermonDetail } from '../../hooks/use-sermon-detail';
import { useSermons } from '../../hooks/use-sermons';
import { formatDate, sermonImageUrl } from '../../lib/format';
import { MediaTabs } from '../players/MediaTabs';
import { MediaCard } from '../ui/MediaCard';
import { DateLabel, SeriesPill, SpeakerLabel, BookLabel } from './SermonInfo';

interface SermonDetailProps {
    id: number;
    config: SermonsConfig;
    onBack: () => void;
    onSermonClick?: (id: number) => void;
}

const SORT_FIELDS = [
    {
        value: 'date',
        label: 'Date',
        icon: <Calendar className='h-3.5 w-3.5' />,
    },
    {
        value: 'title',
        label: 'Title',
        icon: <Type className='h-3.5 w-3.5' />,
    },
];

export function SermonDetail({
    id,
    config,
    onBack,
    onSermonClick,
}: SermonDetailProps) {
    const { data: sermon, isLoading, error } = useSermonDetail(id, config);
    const showRelated = (config.display ?? 'full') !== 'headless';
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortOrder>('desc');

    const { data: seriesData } = useSermons({
        selectedSeriesIds: sermon?.series.id ? [sermon.series.id] : [],
        sort: sortField,
        order: sortDirection,
        config: { ...config, perPage: 50 },
    });

    const relatedSermons = (seriesData?.sermons ?? []).filter(
        (s) => s.id !== id,
    );

    if (error) {
        return (
            <div>
                <Button
                    variant='outline'
                    size='sm'
                    onClick={onBack}
                    className='mb-4'
                >
                    <ArrowLeft className='h-4 w-4' /> Back
                </Button>
                <Empty>
                    <EmptyHeader>
                        <EmptyTitle>Sermon not found</EmptyTitle>
                        <EmptyDescription>
                            This sermon may have been removed or is unavailable.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            </div>
        );
    }

    return (
        <div>
            <Button
                variant='outline'
                size='sm'
                onClick={onBack}
                className='mb-4'
            >
                <ArrowLeft className='h-4 w-4' /> Back
            </Button>
            <SkeletonTransition
                isLoading={isLoading}
                skeleton={
                    <div className='space-y-4'>
                        <Skeleton className='h-8 w-2/3' />
                        <Skeleton className='h-5 w-1/2' />
                        <Skeleton className='h-64 w-full rounded-lg' />
                        <Skeleton className='h-24 w-full' />
                    </div>
                }
            >
                {sermon && (
                    <div className='space-y-6'>
                        <div>
                            <h2 className='text-xl font-bold text-stone-900 dark:text-stone-100'>
                                {sermon.title}
                            </h2>
                            <p className='text-sm text-stone-500 dark:text-stone-400 mt-1'>
                                {sermon.speaker.name} ·{' '}
                                {DateTime.fromISO(sermon.date).toLocaleString(
                                    DateTime.DATE_MED,
                                )}{' '}
                                · {sermon.series.title}
                            </p>
                            {sermon.scriptureLinks && (
                                <p className='text-xs text-stone-400 mt-1'>
                                    Scripture: {sermon.scriptureLinks}
                                </p>
                            )}
                        </div>
                        {sermon.links.length > 0 && (
                            <MediaTabs links={sermon.links} />
                        )}
                        {sermon.description && (
                            <div className='rounded-lg bg-stone-50 p-4 dark:bg-stone-900'>
                                <h3 className='font-semibold text-sm mb-2'>
                                    About this sermon
                                </h3>
                                <div
                                    className='text-sm text-stone-600 dark:text-stone-300 prose prose-sm'
                                    dangerouslySetInnerHTML={{
                                        __html: DOMPurify.sanitize(
                                            sermon.description,
                                        ),
                                    }}
                                />
                            </div>
                        )}

                        {/* More from this series */}
                        {showRelated && relatedSermons.length > 0 && (
                            <div className='space-y-3'>
                                <div className='flex items-center justify-between'>
                                    <h3 className='font-semibold text-sm'>
                                        More from this series
                                    </h3>
                                    <SortSelect
                                        sortField={sortField}
                                        sortDirection={sortDirection}
                                        onSortFieldChange={(f) =>
                                            setSortField(f as SortField)
                                        }
                                        onSortDirectionChange={(d) =>
                                            setSortDirection(d as SortOrder)
                                        }
                                        fields={SORT_FIELDS}
                                    />
                                </div>
                                <div className='divide-y divide-border'>
                                    {relatedSermons.map((s) => (
                                        <MediaCard
                                            key={s.id}
                                            viewMode='list'
                                            imageUrl={
                                                s.bannerUrl
                                                ?? sermonImageUrl(s.id)
                                            }
                                            imageAlt={s.title}
                                            title={s.title}
                                            description={s.shortDescription}
                                            topLeft={
                                                <DateLabel
                                                    date={formatDate(s.date)}
                                                />
                                            }
                                            topRight={
                                                <SeriesPill
                                                    name={s.series.title}
                                                />
                                            }
                                            bottomLeft={
                                                <SpeakerLabel
                                                    name={s.speaker.name}
                                                />
                                            }
                                            bottomRight={
                                                s.book?.name ?
                                                    <BookLabel
                                                        name={s.book.name}
                                                    />
                                                :   undefined
                                            }
                                            onClick={() =>
                                                onSermonClick?.(s.id)
                                            }
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </SkeletonTransition>
        </div>
    );
}
