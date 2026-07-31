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
import headerSource from '../components/AppHeader.tsx?raw';

/**
 * The studio chrome matches the Knowledge Base subsite (Inter + Playfair
 * Display); widgets keep the brand faces. These are separate on purpose, and
 * each half has a failure mode worth pinning:
 *
 * - Repoint `--font-sans` at the chrome face and every shipped widget changes
 *   font, including the ones live on perimeter.org.
 * - Delete the Typekit link to "remove Sweet Sans from the studio" and widget
 *   previews silently fall back to Inter, so the studio stops showing what
 *   production looks like.
 */
describe('studio chrome font', () => {
  it('applies the studio face to the chrome roots, not the brand sans utility', () => {
    for (const [name, source] of [
      ['Layout.tsx', layoutSource],
      ['Sidebar.tsx', sidebarSource],
      ['AppHeader.tsx', headerSource],
    ] as const) {
      expect(source, `${name} should use font-studio`).toContain('font-studio');
      expect(source, `${name} should not use the brand sans utility`).not.toMatch(/\bfont-sans\b/);
    }
  });

  it('keeps the wordmark serif off body text', () => {
    // Playfair is the brand word in the header lockup only. If it ever appears
    // on a chrome root, the whole UI has gone serif.
    expect(headerSource).toContain('font-studio-serif');
    for (const source of [layoutSource, sidebarSource]) {
      expect(source).not.toContain('font-studio-serif');
    }
  });

  it('loads the KB chrome faces and keeps the Typekit kit for the brand faces', () => {
    expect(indexHtml).toContain('family=Inter');
    expect(indexHtml).toContain('family=Playfair+Display');
    // Removing this breaks shadow-root previews and the font-serif specimen.
    // Same URL the preview iframes inject — fonts are per-document, so the kit
    // is needed in both places and the two must not drift.
    expect(indexHtml).toContain(BRAND_FONTS_CSS_URL);
  });
});

describe('brand font tokens are untouched', () => {
  /**
   * Assert the FIRST family, not the mere absence of a chrome face. Both brand
   * stacks legitimately list a chrome face as a *fallback* —
   * `"sweet-sans-pro", Inter, …` and `"freight-display-pro", "Playfair Display", …`
   * — so "does not contain Inter/Playfair" would fail on correct tokens. What
   * matters is which face actually wins.
   */
  const primaryFamily = (stack: string) =>
    stack
      .split(',')[0]!
      .trim()
      .replace(/^["']|["']$/g, '');

  it('keeps sweet-sans-pro as the winning family in the shared font-sans token', () => {
    expect(primaryFamily(globalTokens['font-sans'])).toBe('sweet-sans-pro');
  });

  it('keeps freight-display-pro as the winning family in font-serif', () => {
    expect(primaryFamily(globalTokens['font-serif'])).toBe('freight-display-pro');
  });

  it('pins the brand sans on every widget shadow host, so the chrome face cannot inherit in', () => {
    // font-family inherits and pierces shadow roots; this `:host` declaration is
    // the only reason the studio's own face does not leak into a preview.
    const { cssText } = resolveTokens({});
    expect(cssText).toContain('font-family: var(--font-sans)');
  });
});
