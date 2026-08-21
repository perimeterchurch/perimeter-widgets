import { describe, it, expect } from 'vitest';
import { resolveCachedImageState } from '../src/components/StaffCard';

/**
 * `onError` alone cannot be trusted: a cached failure completes before React
 * attaches the handler, so the event never fires and the card would show a
 * broken image instead of falling back to its initials tile.
 *
 * (The `loaded` half of this problem is gone by design — see StaffPhoto. A
 * fade-in meant ~200 concurrent opacity transitions on a full directory, and
 * the browser stalled every one of them at opacity 0 over a fully-decoded
 * photo. There is no longer any load state to get stuck.)
 */
describe('resolveCachedImageState', () => {
  it('reports a cached, decoded image as loaded', () => {
    expect(resolveCachedImageState({ complete: true, naturalWidth: 1920 })).toBe('loaded');
  });

  it('reports a completed-but-broken image as failed', () => {
    // `complete` is true for a 404 too, which is why naturalWidth is checked —
    // this is the case that reaches the initials tile without an onError event.
    expect(resolveCachedImageState({ complete: true, naturalWidth: 0 })).toBe('failed');
  });

  it('leaves a still-loading image to its own onError', () => {
    expect(resolveCachedImageState({ complete: false, naturalWidth: 0 })).toBe('pending');
  });
});
