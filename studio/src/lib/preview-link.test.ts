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

describe('preview-link codec', () => {
  it('omits params for an empty/default state (clean URL)', () => {
    const params = encodePreviewState({
      config: {},
      tokens: {},
      theme: 'light',
      viewport: 'fluid',
    });
    expect(params.toString()).toBe('');
  });

  it('round-trips config, tokens, theme, and a preset viewport', () => {
    const state: PreviewState = {
      config: { limit: 12, showImages: true, title: 'Recent' },
      tokens: { '--p-radius': '8px', '--p-color-primary': '#abcdef' },
      theme: 'dark',
      viewport: 'tablet',
    };
    const params = encodePreviewState(state);
    expect(decodePreviewState(params)).toEqual(state);
  });

  it('round-trips a custom numeric viewport', () => {
    const viewport: PreviewViewport = { custom: 500 };
    const params = encodePreviewState({
      config: {},
      tokens: {},
      theme: 'light',
      viewport,
    });
    expect(decodePreviewState(params).viewport).toEqual(viewport);
  });

  it('defaults missing params to an empty/light/fluid state', () => {
    const decoded = decodePreviewState(new URLSearchParams(''));
    expect(decoded).toEqual({ config: {}, tokens: {}, theme: 'light', viewport: 'fluid' });
  });

  it('never throws on malformed json — falls back to empty', () => {
    const params = new URLSearchParams(
      'config=%7Bnot-json&tokens=garbage&theme=neon&viewport=999x',
    );
    const decoded = decodePreviewState(params);
    expect(decoded.config).toEqual({});
    expect(decoded.tokens).toEqual({});
    // Unknown theme falls back to light; unparseable viewport falls back to fluid.
    expect(decoded.theme).toBe('light');
    expect(decoded.viewport).toBe('fluid');
  });
});
