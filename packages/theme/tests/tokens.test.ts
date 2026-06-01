import { describe, it, expect } from 'vitest';
import { globalTokens, type ThemeToken } from '../src/tokens';

describe('globalTokens', () => {
  it('includes the Phase 1 baseline tokens', () => {
    const required: ThemeToken[] = [
      'color-bg',
      'color-fg',
      'color-muted',
      'color-muted-fg',
      'color-primary',
      'color-primary-fg',
      'color-secondary',
      'color-secondary-fg',
      'color-accent',
      'color-accent-fg',
      'color-destructive',
      'color-destructive-fg',
      'color-border',
      'color-ring',
      'radius-sm',
      'radius-md',
      'radius-lg',
      'font-sans',
      'font-mono',
    ];
    for (const key of required) expect(globalTokens[key]).toBeTruthy();
  });

  it('every value is a non-empty string', () => {
    for (const [key, value] of Object.entries(globalTokens)) {
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
      void key;
    }
  });

  it('uses px (not rem) for radius so host font-size cannot rescale widgets', () => {
    for (const [key, value] of Object.entries(globalTokens)) {
      if (key.startsWith('radius-')) expect(value).toMatch(/px$/);
    }
  });
});
