import { describe, expect, it } from 'vitest';
import { globalTokens, darkTokens } from '../src/tokens';

describe('darkTokens', () => {
  it('has exactly the same keys as globalTokens', () => {
    expect(Object.keys(darkTokens).sort()).toEqual(Object.keys(globalTokens).sort());
  });
  it('inverts the core surface colors', () => {
    expect(darkTokens['color-bg']).not.toBe(globalTokens['color-bg']);
    expect(darkTokens['color-fg']).not.toBe(globalTokens['color-fg']);
  });
  it('keeps radii and fonts identical to light', () => {
    expect(darkTokens['radius-sm']).toBe(globalTokens['radius-sm']);
    expect(darkTokens['radius-md']).toBe(globalTokens['radius-md']);
    expect(darkTokens['radius-lg']).toBe(globalTokens['radius-lg']);
    expect(darkTokens['font-sans']).toBe(globalTokens['font-sans']);
    expect(darkTokens['font-mono']).toBe(globalTokens['font-mono']);
  });
});
