import { describe, expect, it } from 'vitest';
import { resolveTokens } from '../src/resolver';
import { darkTokens } from '../src/tokens';

describe('resolveTokens dark block', () => {
  it('emits :host and :host([data-theme="dark"])', () => {
    const { cssText } = resolveTokens({});
    expect(cssText).toContain(':host {');
    expect(cssText).toContain(':host([data-theme="dark"]) {');
    expect(cssText).toContain(`--color-bg: ${darkTokens['color-bg']};`);
  });
  it('applies runtime overrides to BOTH light and dark blocks', () => {
    const { cssText } = resolveTokens({ runtimeOverrides: { 'color-primary': 'rebeccapurple' } });
    const dark = cssText.slice(cssText.indexOf(':host(['));
    const light = cssText.slice(0, cssText.indexOf(':host(['));
    expect(light).toContain('--color-primary: rebeccapurple;');
    expect(dark).toContain('--color-primary: rebeccapurple;');
  });
});
