import { useState, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@perimeter/ui/tabs';
import { Spinner } from '@perimeter/ui/spinner';
import { Video, Headphones, FileText, FileX } from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import type { SermonLink } from '../../types';

// VideoPlayer pulls in hls.js (~150-200 KB). Lazy-load it (like PdfViewer) so
// that weight stays out of the main IIFE chunk and only loads on demand.
const VideoPlayer = lazy(() => import('./VideoPlayer'));
const PdfViewer = lazy(() => import('./PdfViewer').then((m) => ({ default: m.PdfViewer })));

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

const iconClass = 'h-4 w-4';

export function MediaTabs({ links }: MediaTabsProps) {
  const videoLink = links.find((l) => l.mediaType === 'video');
  const audioLink = links.find((l) => l.mediaType === 'audio');
  const docLink = links.find((l) => l.mediaType === 'document');

  const availableTabs: {
    id: MediaTab;
    label: string;
    icon: React.ReactNode;
  }[] = [];
  if (videoLink)
    availableTabs.push({
      id: 'video',
      label: 'Watch',
      icon: <Video className={iconClass} />,
    });
  if (audioLink)
    availableTabs.push({
      id: 'audio',
      label: 'Listen',
      icon: <Headphones className={iconClass} />,
    });
  if (docLink)
    availableTabs.push({
      id: 'document',
      label: 'PDF',
      icon: <FileText className={iconClass} />,
    });

  const [activeTab, setActiveTab] = useState<string>(availableTabs[0]?.id ?? 'video');

  // Some sermons have no media uploaded yet. Rather than rendering nothing
  // (which leaves a confusing gap), show a small affordance so visitors know
  // media is expected but not yet available.
  if (availableTabs.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted p-4 text-sm text-muted-fg">
        <FileX className="h-4 w-4 shrink-0" aria-hidden="true" />
        No media available yet for this sermon.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-10">
          {availableTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 px-4 text-sm">
              {tab.icon}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="overflow-hidden rounded-lg border border-border min-h-[300px]">
        <AnimatePresence mode="wait">
          {activeTab === 'video' && videoLink && (
            <motion.div key="video" {...fade} className="aspect-video">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center bg-black">
                    <Spinner className="size-8" aria-label="Loading video player" />
                  </div>
                }
              >
                <VideoPlayer url={videoLink.url} />
              </Suspense>
            </motion.div>
          )}
          {activeTab === 'audio' && audioLink && (
            <motion.div
              key="audio"
              {...fade}
              className="flex h-[300px] items-center justify-center"
            >
              <AudioPlayer url={audioLink.url} />
            </motion.div>
          )}
          {activeTab === 'document' && docLink && (
            <motion.div key="document" {...fade}>
              <Suspense
                fallback={
                  <div className="flex h-[400px] items-center justify-center">
                    <Spinner className="size-8" aria-label="Loading PDF viewer" />
                  </div>
                }
              >
                <div className="h-[600px]">
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
