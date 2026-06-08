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
      background: 'host-sim',
    });
    expect(params.toString()).toBe('');
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
    const params = encodePreviewState({
      config: {},
      tokens: {},
      theme: 'light',
      viewport: 'fluid',
      background: 'host-sim',
    });
    expect(params.has('bg')).toBe(false);
    expect(decodePreviewState(params).background).toBe('host-sim');
  });

  it('falls back to host-sim for an unknown background value', () => {
    const params = new URLSearchParams('bg=chartreuse');
    expect(decodePreviewState(params).background).toBe('host-sim');
  });

  it('round-trips a custom numeric viewport', () => {
    const viewport: PreviewViewport = { custom: 500 };
    const params = encodePreviewState({
      config: {},
      tokens: {},
      theme: 'light',
      viewport,
      background: 'host-sim',
    });
    expect(decodePreviewState(params).viewport).toEqual(viewport);
  });

  it('defaults missing params to an empty/light/fluid state', () => {
    const decoded = decodePreviewState(new URLSearchParams(''));
    expect(decoded).toEqual({
      config: {},
      tokens: {},
      theme: 'light',
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
    // Unknown theme falls back to light; unparseable viewport falls back to fluid.
    expect(decoded.theme).toBe('light');
    expect(decoded.viewport).toBe('fluid');
  });
});
