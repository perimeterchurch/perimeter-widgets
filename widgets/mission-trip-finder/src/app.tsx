import * as React from 'react';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import type { MissionTripFinderConfig } from './types';
import { useTripNavigation } from './hooks/use-trip-navigation';
import { usePageTakeover } from './hooks/use-page-takeover';
import { TripGrid } from './components/TripGrid';
import { TripDetail } from './components/TripDetail';

export interface AppProps {
  config: MissionTripFinderConfig;
}

const fadeSlide = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] as const },
  },
};

function MissionTripWidget({ config }: AppProps): React.JSX.Element {
  const nav = useTripNavigation(config);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Driven from here rather than from inside TripDetail. The views below are
  // keyed by screen, so TripDetail REMOUNTS when a participant opens or closes —
  // and a takeover that mounts with it would tear itself down and restore the
  // reader's scroll position in the middle of a visit. Up here its lifetime is
  // the whole visit: from opening a trip to going back to the list.
  usePageTakeover({
    enabled: config.detailLayout === 'takeover' && nav.screen === 'detail' && nav.id !== null,
    screen: nav.pledgeId !== null ? 'participant' : 'detail',
    hideSelector: config.takeoverHide,
    anchorRef: rootRef,
  });

  const viewKey =
    nav.screen === 'detail' && nav.id
      ? nav.pledgeId
        ? `participant-${nav.id}-${nav.pledgeId}`
        : `detail-${nav.id}`
      : 'browse';

  return (
    <div ref={rootRef} className="@container text-left">
      {/* One fade for the whole screen. Individual cards and avatars are
          deliberately not animated: a roster or a long grid animating each
          element is the shape that strands items at opacity 0 on a real host
          page. */}
      <AnimatePresence mode="wait">
        <motion.div key={viewKey} {...fadeSlide}>
          {nav.screen === 'detail' && nav.id ? (
            <TripDetail
              id={nav.id}
              config={config}
              onBack={nav.back}
              showBack={!nav.isPinned}
              pledgeId={nav.pledgeId}
              onSelectParticipant={nav.openParticipant}
              onCloseParticipant={nav.closeParticipant}
            />
          ) : (
            <TripGrid config={config} onOpenTrip={nav.openTrip} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function App({ config }: AppProps): React.JSX.Element {
  // reducedMotion="user" drops the transform half of the transition for
  // prefers-reduced-motion visitors while keeping the opacity fade.
  return (
    <MotionConfig reducedMotion="user">
      <NuqsAdapter>
        <MissionTripWidget config={config} />
      </NuqsAdapter>
    </MotionConfig>
  );
}
