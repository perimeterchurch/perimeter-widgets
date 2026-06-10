import { describe, it, expect } from 'vitest';
import preset from '../src/tailwind';

describe('tailwindPreset', () => {
  it('maps every color token to a CSS variable', () => {
    const colors = (preset.theme?.extend?.colors ?? {}) as Record<string, string>;
    expect(colors['primary']).toBe('var(--color-primary)');
    expect(colors['accent']).toBe('var(--color-accent)');
    expect(colors['destructive-fg']).toBe('var(--color-destructive-fg)');
  });

  it('maps radius tokens to CSS variables', () => {
    const r = (preset.theme?.extend?.borderRadius ?? {}) as Record<string, string>;
    expect(r['md']).toBe('var(--radius-md)');
  });

  it('maps font families to CSS variables', () => {
    const f = (preset.theme?.extend?.fontFamily ?? {}) as Record<string, [string]>;
    expect(f['sans']).toEqual(['var(--font-sans)']);
  });

  it('maps shadow tokens to CSS variables', () => {
    const s = (preset.theme?.extend?.boxShadow ?? {}) as Record<string, string>;
    expect(s['xs']).toBe('var(--shadow-xs)');
    expect(s['md']).toBe('var(--shadow-md)');
    expect(s['xl']).toBe('var(--shadow-xl)');
  });

  it('maps type-scale tokens to CSS variables with unitless line-heights', () => {
    const f = (preset.theme?.extend?.fontSize ?? {}) as Record<
      string,
      [string, { lineHeight: string }]
    >;
    expect(f['sm']).toEqual(['var(--text-sm)', { lineHeight: '1.4286' }]);
    expect(f['base']).toEqual(['var(--text-base)', { lineHeight: '1.5' }]);
  });
});
