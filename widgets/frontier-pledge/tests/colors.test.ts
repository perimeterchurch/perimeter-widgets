import { describe, it, expect } from 'vitest';
import { bandColorStyle, cssColor } from '../src/lib/colors';
import { FrontierPledgeConfigSchema } from '../src/types';

describe('cssColor', () => {
  it('accepts 3- and 6-digit hex colors, trimmed', () => {
    expect(cssColor('#1d4d3f')).toBe('#1d4d3f');
    expect(cssColor('#FFF')).toBe('#FFF');
    expect(cssColor('  #e07a5f ')).toBe('#e07a5f');
  });

  it('ignores unset, blank and non-hex values so the brand default shows', () => {
    expect(cssColor(undefined)).toBeUndefined();
    expect(cssColor('')).toBeUndefined();
    expect(cssColor('1d4d3f')).toBeUndefined();
    expect(cssColor('#1d4d3')).toBeUndefined();
    expect(cssColor('green')).toBeUndefined();
    expect(cssColor('red; background: url(x)')).toBeUndefined();
  });
});

describe('bandColorStyle', () => {
  it('sets nothing when no colors are configured', () => {
    expect(bandColorStyle(FrontierPledgeConfigSchema.parse({}))).toEqual({});
  });

  it('re-points the band tokens for each configured color', () => {
    const config = FrontierPledgeConfigSchema.parse({
      backgroundColor: '#1d4d3f',
      textColor: '#f4efe3',
      accentColor: '#e07a5f',
      buttonTextColor: '#ffffff',
    });
    expect(bandColorStyle(config)).toEqual({
      '--color-surface-dark': '#1d4d3f',
      '--color-surface-dark-fg': '#f4efe3',
      '--color-warning': '#e07a5f',
      '--color-warning-fg': '#ffffff',
    });
  });

  it('drops an invalid color instead of passing it through', () => {
    const config = FrontierPledgeConfigSchema.parse({ backgroundColor: 'navy', textColor: '#fff' });
    expect(bandColorStyle(config)).toEqual({ '--color-surface-dark-fg': '#fff' });
  });
});
