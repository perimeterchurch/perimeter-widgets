export type ContainerBreakpoint = 'phone' | 'tablet' | 'desktop';

/**
 * Thresholds MUST match the CSS container queries in the components:
 * `@min-[480px]:` and `@min-[768px]:`. Written in px on both sides because the
 * build's rem→px rewrite does not touch `@container` params, so a rem
 * threshold would drift with the host page's root font-size.
 */
export const PHONE_MAX = 480;
export const TABLET_MAX = 768;

export function bucketFor(width: number): ContainerBreakpoint {
  if (width < PHONE_MAX) return 'phone';
  if (width < TABLET_MAX) return 'tablet';
  return 'desktop';
}
