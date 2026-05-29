import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveTokens } from '../src/resolver';
import { globalTokens } from '../src/tokens';

describe('resolveTokens', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns global tokens when no overrides are passed', () => {
    const { tokens } = resolveTokens({});
    expect(tokens['color-primary']).toBe(globalTokens['color-primary']);
  });

  it('applies widget overrides over global tokens', () => {
    const { tokens } = resolveTokens({ widgetOverrides: { 'color-primary': 'hsl(15 80% 50%)' } });
    expect(tokens['color-primary']).toBe('hsl(15 80% 50%)');
  });

  it('applies data-attr overrides over widget overrides', () => {
    const { tokens } = resolveTokens({
      widgetOverrides: { 'color-primary': 'hsl(15 80% 50%)' },
      dataAttrOverrides: { 'data-theme-color-primary': 'hsl(99 99% 99%)' },
    });
    expect(tokens['color-primary']).toBe('hsl(99 99% 99%)');
  });

  it('applies runtime overrides over everything else (Studio editor layer)', () => {
    const { tokens } = resolveTokens({
      widgetOverrides: { 'color-primary': 'hsl(15 80% 50%)' },
      dataAttrOverrides: { 'data-theme-color-primary': 'hsl(99 99% 99%)' },
      runtimeOverrides: { 'color-primary': 'hsl(1 1% 1%)' },
    });
    expect(tokens['color-primary']).toBe('hsl(1 1% 1%)');
  });

  it('drops unknown data-attr tokens and warns', () => {
    const { tokens } = resolveTokens({ dataAttrOverrides: { 'data-theme-not-a-token': 'red' } });
    expect('not-a-token' in tokens).toBe(false);
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('not-a-token');
  });

  it('ignores data-* attributes that do not start with data-theme-', () => {
    resolveTokens({ dataAttrOverrides: { 'data-limit': '6', 'data-greeting': 'Hello' } });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('produces cssText with one declaration per resolved token', () => {
    const { cssText } = resolveTokens({});
    expect(cssText.startsWith(':host')).toBe(true);
    const declCount = cssText.split('--').length - 1;
    expect(declCount).toBe(Object.keys(globalTokens).length);
  });
});
