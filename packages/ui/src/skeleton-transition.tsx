import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { transitions } from './lib/motion-config';

export interface SkeletonTransitionProps {
  /** Whether the content is loading */
  isLoading: boolean;
  /** Skeleton placeholder to show while loading */
  skeleton: ReactNode;
  /** Actual content to show when loaded */
  children: ReactNode;
}

export function SkeletonTransition({ isLoading, skeleton, children }: SkeletonTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transitions.fast}
        >
          {skeleton}
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transitions.base}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
