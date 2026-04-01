import DOMPurify from 'dompurify';
import { DateTime } from 'luxon';
import { ArrowLeft } from 'lucide-react';
import {
    Button,
    Empty,
    EmptyHeader,
    EmptyTitle,
    EmptyDescription,
    Skeleton,
} from '@perimeter-widgets/shared';
import { SkeletonTransition } from '@perimeter-widgets/shared/components/motion';
import type { SermonsConfig } from '../../types';
import { useSermonDetail } from '../../hooks/use-sermon-detail';
import { MediaTabs } from '../players/MediaTabs';

interface SermonDetailProps {
    id: number;
    config: SermonsConfig;
    onBack: () => void;
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

export function SermonDetail({ id, config, onBack }: SermonDetailProps) {
    const { data: sermon, isLoading, error } = useSermonDetail(id, config);

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
                <ArrowLeft className='h-4 w-4' /> Back to sermons
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
                    <div className='space-y-4'>
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
                        <div className='flex items-center gap-3 rounded-lg bg-stone-50 p-4 dark:bg-stone-900'>
                            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-stone-200 text-sm font-semibold text-stone-600 dark:bg-stone-700 dark:text-stone-300'>
                                {getInitials(sermon.speaker.name)}
                            </div>
                            <div>
                                <p className='font-semibold text-sm'>
                                    {sermon.speaker.name}
                                </p>
                                {sermon.speaker.bio && (
                                    <p className='text-xs text-stone-500 mt-0.5 line-clamp-2'>
                                        {sermon.speaker.bio}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </SkeletonTransition>
        </div>
    );
}
