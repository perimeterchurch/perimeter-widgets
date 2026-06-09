export type ContainerBreakpoint = 'phone' | 'tablet' | 'desktop';

// Thresholds MUST match the CSS container breakpoints used in the grids:
// @[30rem] = 480px, @[48rem] = 768px.
const PHONE_MAX = 480;
const TABLET_MAX = 768;

export function bucketFor(width: number): ContainerBreakpoint {
  if (width < PHONE_MAX) return 'phone';
  if (width < TABLET_MAX) return 'tablet';
  return 'desktop';
}
