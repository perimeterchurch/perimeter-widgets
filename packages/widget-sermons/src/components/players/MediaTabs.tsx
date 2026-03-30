import { useState, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, Spinner } from '@perimeter-widgets/shared';
import { VideoPlayer } from './VideoPlayer';
import { AudioPlayer } from './AudioPlayer';
import type { SermonLink } from '../../types';

const PdfViewer = lazy(() =>
    import('./PdfViewer').then((m) => ({ default: m.PdfViewer })),
);

const fade = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.12, ease: [0.16, 1, 0.3, 1] as const },
    },
};

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

    const [activeTab, setActiveTab] = useState<string>(
        availableTabs[0]?.id ?? 'video',
    );

    if (availableTabs.length === 0) return null;

    return (
        <div className='overflow-hidden rounded-lg border border-[var(--color-border)]'>
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
            >
                <TabsList>
                    {availableTabs.map((tab) => (
                        <TabsTrigger key={tab.id} value={tab.id}>
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
            <div className='min-h-[300px]'>
                <AnimatePresence mode='wait'>
                    {activeTab === 'video' && videoLink && (
                        <motion.div
                            key='video'
                            {...fade}
                            className='aspect-video'
                        >
                            <VideoPlayer url={videoLink.url} />
                        </motion.div>
                    )}
                    {activeTab === 'audio' && audioLink && (
                        <motion.div
                            key='audio'
                            {...fade}
                            className='flex h-[300px] items-center justify-center'
                        >
                            <AudioPlayer url={audioLink.url} />
                        </motion.div>
                    )}
                    {activeTab === 'document' && docLink && (
                        <motion.div key='document' {...fade}>
                            <Suspense
                                fallback={
                                    <div className='flex h-[400px] items-center justify-center'>
                                        <Spinner
                                            className='size-8'
                                            aria-label='Loading PDF viewer'
                                        />
                                    </div>
                                }
                            >
                                <div className='h-[600px]'>
                                    <PdfViewer url={docLink.url} />
                                </div>
                            </Suspense>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
