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
});
