import type { Transition } from 'framer-motion';

export const durations = {
  fast: 0.15,
  base: 0.2,
  slow: 0.3,
  entrance: 0.4,
};

export const easings = {
  easeOut: [0.16, 1, 0.3, 1] as const,
  easeInOut: [0.4, 0, 0.2, 1] as const,
};

export const transitions = {
  fast: {
    duration: durations.fast,
    ease: easings.easeOut,
  } satisfies Transition,

  base: {
    duration: durations.base,
    ease: easings.easeOut,
  } satisfies Transition,

  slow: {
    duration: durations.slow,
    ease: easings.easeOut,
  } satisfies Transition,

  entrance: {
    duration: durations.entrance,
    ease: easings.easeOut,
  } satisfies Transition,
};
