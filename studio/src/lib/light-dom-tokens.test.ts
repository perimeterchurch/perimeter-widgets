// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { globalTokens, darkTokens } from '@perimeter/theme';
import { installRootTokens, rootTokenCss } from './light-dom-tokens';

describe('rootTokenCss', () => {
  it('emits every global token as a :root custom property', () => {
    const css = rootTokenCss();
    expect(css.startsWith(':root {')).toBe(true);
    for (const [k, v] of Object.entries(globalTokens)) {
      expect(css).toContain(`--${k}: ${v};`);
    }
  });

  it('emits a :root[data-theme="dark"] block with every dark token', () => {
    const css = rootTokenCss();
    expect(css).toContain(':root[data-theme="dark"] {');
    for (const [k, v] of Object.entries(darkTokens)) {
      expect(css).toContain(`--${k}: ${v};`);
    }
  });

  it('uses the dark color-bg value in the dark block', () => {
    const css = rootTokenCss();
    // The dark surface is the load-bearing flag that the dark layer is present.
    expect(css).toContain(`--color-bg: ${darkTokens['color-bg']};`);
  });
});

describe('installRootTokens', () => {
  afterEach(() => {
    document.getElementById('studio-root-tokens')?.remove();
  });

  it('injects a single <style> tag carrying the token css', () => {
    installRootTokens();
    const style = document.getElementById('studio-root-tokens');
    expect(style).toBeInstanceOf(HTMLStyleElement);
    expect(style?.textContent).toBe(rootTokenCss());
    expect(style?.parentElement).toBe(document.head);
  });

  it('is idempotent — repeated calls do not duplicate the layer', () => {
    installRootTokens();
    installRootTokens();
    expect(document.querySelectorAll('#studio-root-tokens')).toHaveLength(1);
  });
});
