import { describe, it, expect } from 'vitest';
import {
  encodePreviewState,
  decodePreviewState,
  type PreviewState,
  type PreviewViewport,
} from './preview-link';

// The preview-link codec is the single source of truth for what a shareable
// preview URL carries (config overrides + token overrides + theme + viewport).
// It must round-trip losslessly and degrade gracefully on garbage input (a
// hand-edited or stale link must never throw and white-screen the standalone
// route).

const baseState: PreviewState = {
  config: {},
  tokens: {},
  theme: undefined,
  viewport: 'fluid',
  background: 'host-sim',
};
const stateWith = (overrides: Partial<PreviewState>): PreviewState => ({
  ...baseState,
  ...overrides,
});

describe('preview-link codec', () => {
  it('omits params for an empty/default state (clean URL)', () => {
    const params = encodePreviewState({
      config: {},
      tokens: {},
      theme: undefined,
      viewport: 'fluid',
      background: 'host-sim',
    });
    expect(params.toString()).toBe('');
  });

  it('pins an explicit theme (both light and dark) so it survives over chrome', () => {
    // An unpinned theme (undefined) stays out of the URL — the preview follows the
    // studio chrome theme. A pinned theme is written for BOTH light and dark so a
    // pinned-light preview wins even when the recipient's chrome is dark.
    expect(encodePreviewState(stateWith({ theme: undefined })).has('theme')).toBe(false);
    expect(encodePreviewState(stateWith({ theme: 'light' })).get('theme')).toBe('light');
    expect(encodePreviewState(stateWith({ theme: 'dark' })).get('theme')).toBe('dark');
    expect(decodePreviewState(new URLSearchParams('theme=light')).theme).toBe('light');
  });

  it('round-trips config, tokens, theme, viewport, and a non-default background', () => {
    const state: PreviewState = {
      config: { limit: 12, showImages: true, title: 'Recent' },
      tokens: { '--p-radius': '8px', '--p-color-primary': '#abcdef' },
      theme: 'dark',
      viewport: 'tablet',
      background: 'dark',
    };
    const params = encodePreviewState(state);
    expect(decodePreviewState(params)).toEqual(state);
  });

  it('omits the background param at the host-sim default and restores it when absent', () => {
    const params = encodePreviewState(stateWith({ background: 'host-sim' }));
    expect(params.has('bg')).toBe(false);
    expect(decodePreviewState(params).background).toBe('host-sim');
  });

  it('falls back to host-sim for an unknown background value', () => {
    const params = new URLSearchParams('bg=chartreuse');
    expect(decodePreviewState(params).background).toBe('host-sim');
  });

  it('round-trips a custom numeric viewport', () => {
    const viewport: PreviewViewport = { custom: 500 };
    const params = encodePreviewState(stateWith({ viewport }));
    expect(decodePreviewState(params).viewport).toEqual(viewport);
  });

  it('defaults missing params to an empty/follow-chrome/fluid state', () => {
    const decoded = decodePreviewState(new URLSearchParams(''));
    expect(decoded).toEqual({
      config: {},
      tokens: {},
      theme: undefined,
      viewport: 'fluid',
      background: 'host-sim',
    });
  });

  it('never throws on malformed json — falls back to empty', () => {
    const params = new URLSearchParams(
      'config=%7Bnot-json&tokens=garbage&theme=neon&viewport=999x',
    );
    const decoded = decodePreviewState(params);
    expect(decoded.config).toEqual({});
    expect(decoded.tokens).toEqual({});
    // Unknown theme falls back to follow-chrome (undefined); unparseable viewport
    // falls back to fluid.
    expect(decoded.theme).toBeUndefined();
    expect(decoded.viewport).toBe('fluid');
  });
});
