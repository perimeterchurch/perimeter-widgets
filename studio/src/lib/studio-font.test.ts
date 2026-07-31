import { describe, it, expect } from 'vitest';
import { globalTokens, resolveTokens } from '@perimeter/theme';
import { BRAND_FONTS_CSS_URL } from './brand-fonts';
// `?raw` rather than node:fs — the studio's TS program is browser-only
// (`types: ["vite/client"]`), so it has no node globals.
//
// Note there is no assertion on `styles.css` itself: vitest runs with its
// default `css: false`, which stubs CSS imports to an empty string even through
// `?raw`. The `--font-studio` declaration living there is instead covered by the
// obviousness of its failure — drop it and the whole chrome falls back to the
// browser default face.
import indexHtml from '../../index.html?raw';
import layoutSource from '../components/Layout.tsx?raw';
import sidebarSource from '../components/Sidebar.tsx?raw';

/**
 * The studio chrome uses Geist; widgets keep the brand sans. These are separate
 * on purpose, and each half has a failure mode worth pinning:
 *
 * - Repoint `--font-sans` at Geist and every shipped widget changes font,
 *   including the ones live on perimeter.org.
 * - Delete the Typekit link to "remove Sweet Sans from the studio" and widget
 *   previews silently fall back to Inter, so the studio stops showing what
 *   production looks like.
 */
describe('studio chrome font', () => {
  it('applies the studio face to the chrome roots, not the brand sans utility', () => {
    for (const [name, source] of [
      ['Layout.tsx', layoutSource],
      ['Sidebar.tsx', sidebarSource],
    ] as const) {
      expect(source, `${name} should use font-studio`).toContain('font-studio');
      expect(source, `${name} should not use the brand sans utility`).not.toMatch(/\bfont-sans\b/);
    }
  });

  it('loads Geist and keeps the Typekit kit for the brand faces', () => {
    expect(indexHtml).toContain('family=Geist');
    // Removing this breaks shadow-root previews and the font-serif specimen.
    // Same URL the preview iframes inject — fonts are per-document, so the kit
    // is needed in both places and the two must not drift.
    expect(indexHtml).toContain(BRAND_FONTS_CSS_URL);
  });
});

describe('brand font tokens are untouched', () => {
  it('keeps sweet-sans-pro as the shared font-sans token', () => {
    expect(globalTokens['font-sans']).toContain('sweet-sans-pro');
    expect(globalTokens['font-sans']).not.toContain('Geist');
  });

  it('keeps freight-display-pro as font-serif', () => {
    expect(globalTokens['font-serif']).toContain('freight-display-pro');
  });

  it('pins the brand sans on every widget shadow host, so Geist cannot inherit in', () => {
    // font-family inherits and pierces shadow roots; this `:host` declaration is
    // the only reason the studio's own face does not leak into a preview.
    const { cssText } = resolveTokens({});
    expect(cssText).toContain('font-family: var(--font-sans)');
  });
});
