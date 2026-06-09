/**
 * Per-side horizontal gutter for the studio HostFrame, ramped to the canvas
 * frame width so narrow presets simulate a real responsive host (a phone page
 * has a small gutter, not the 90px desktop one). Linear from a 16px floor at
 * frames <= 640px to the 90px desktop gutter at frames >= 1200px. Undefined
 * frame width (fluid preset) keeps the desktop gutter — current behavior.
 */
export function hostFrameGutter(frameWidth: number | undefined): number {
  const MIN = 16;
  const MAX = 90; // mirrors hostProfile.contentPaddingX
  const LO = 640;
  const HI = 1200;
  if (frameWidth == null) return MAX;
  if (frameWidth <= LO) return MIN;
  if (frameWidth >= HI) return MAX;
  const t = (frameWidth - LO) / (HI - LO);
  return Math.round(MIN + t * (MAX - MIN));
}
