import { describe, expect, it } from 'vitest';
import { resolveTokens } from '../src/resolver';

/**
 * The token sheet must make `:host` a real themed SURFACE, not just a variable
 * bag. Without these declarations the widget paints no background and inherits
 * the host page's `color`/`font-size` through the shadow boundary — in dark
 * theme that renders dark-token borders/elements on the host's light backdrop
 * with the host's dark text (the 2026-06-10 sermons dark-mode bug).
 */
describe('resolveTokens :host surface', () => {
  const { cssText } = resolveTokens({});
  const darkIndex = cssText.indexOf(':host([data-theme="dark"])');
  const light = cssText.slice(0, darkIndex);
  const dark = cssText.slice(darkIndex);

  it('paints the themed background on the light :host block', () => {
    expect(light).toContain('background-color: var(--color-bg);');
  });

  it('resets the inherited host color and type on the light :host block', () => {
    expect(light).toContain('color: var(--color-fg);');
    expect(light).toContain('font-family: var(--font-sans);');
    expect(light).toContain('font-size: 16px;');
    expect(light).toContain('line-height: 1.5;');
  });

  it('declares color-scheme per theme so native UI (scrollbars, form controls) matches', () => {
    expect(light).toContain('color-scheme: light;');
    expect(dark).toContain('color-scheme: dark;');
  });

  it('does not duplicate var-referencing surface declarations in the dark block (vars swap)', () => {
    expect(dark).not.toContain('background-color:');
  });
});
