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

  it('produces a light :host block and a dark :host([data-theme="dark"]) block, each with one declaration per resolved token', () => {
    const { cssText } = resolveTokens({});
    expect(cssText.startsWith(':host')).toBe(true);
    // Two blocks: the light `:host` and the dark `:host([data-theme="dark"])`.
    expect(cssText.match(/:host/g)!.length).toBe(2);
    const tokenCount = Object.keys(globalTokens).length;
    const darkIndex = cssText.indexOf(':host([data-theme="dark"])');
    const light = cssText.slice(0, darkIndex);
    const dark = cssText.slice(darkIndex);
    // Count custom-property declaration LINES (`  --key: value;`), not raw `--`
    // occurrences — the :host surface declarations reference tokens via var().
    const countVarDecls = (block: string) => (block.match(/^ {2}--[\w-]+:/gm) ?? []).length;
    expect(countVarDecls(light)).toBe(tokenCount);
    expect(countVarDecls(dark)).toBe(tokenCount);
    // Total custom-property declarations are one per token per block.
    expect(countVarDecls(cssText)).toBe(tokenCount * 2);
  });
});
