import { useState, lazy, Suspense } from 'react';
import { Tabs, LoadingSpinner } from '@perimeter-widgets/shared';
import { VideoPlayer } from './VideoPlayer';
import { AudioPlayer } from './AudioPlayer';
import type { SermonLink } from '../../types';

const PdfViewer = lazy(() =>
    import('./PdfViewer').then((m) => ({ default: m.PdfViewer })),
);

export interface MediaTabsProps {
    links: SermonLink[];
}

type MediaTab = 'video' | 'audio' | 'document';

export function MediaTabs({ links }: MediaTabsProps) {
    const videoLink = links.find((l) => l.mediaType === 'video');
    const audioLink = links.find((l) => l.mediaType === 'audio');
    const docLink = links.find((l) => l.mediaType === 'document');

    const availableTabs: { id: MediaTab; label: string }[] = [];
    if (videoLink) availableTabs.push({ id: 'video', label: 'Watch' });
    if (audioLink) availableTabs.push({ id: 'audio', label: 'Listen' });
    if (docLink) availableTabs.push({ id: 'document', label: 'PDF' });

    const [activeTab, setActiveTab] = useState<string>(availableTabs[0]?.id ?? 'video');

    if (availableTabs.length === 0) return null;

    return (
        <div className="overflow-hidden rounded-lg border border-stone-200 dark:border-stone-700">
            <Tabs tabs={availableTabs} activeTab={activeTab} onChange={setActiveTab} />
            <div className="min-h-[300px]">
                {activeTab === 'video' && videoLink && (
                    <div className="aspect-video">
                        <VideoPlayer url={videoLink.url} />
                    </div>
                )}
                {activeTab === 'audio' && audioLink && (
                    <AudioPlayer url={audioLink.url} />
                )}
                {activeTab === 'document' && docLink && (
                    <Suspense fallback={<div className="flex h-[400px] items-center justify-center"><LoadingSpinner size="lg" label="Loading PDF viewer" /></div>}>
                        <div className="h-[600px]">
                            <PdfViewer url={docLink.url} />
                        </div>
                    </Suspense>
                )}
            </div>
        </div>
    );
}
