import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { toDtcg } from '../src/dtcg';
import { globalTokens, darkTokens } from '../src/tokens';

const COMMITTED = fileURLToPath(new URL('../tokens.dtcg.json', import.meta.url));

describe('toDtcg', () => {
  const doc = toDtcg();

  it('emits a light and a dark group with one token per source token', () => {
    const count = (group: object) =>
      Object.values(group).reduce(
        (n: number, cat) => n + Object.keys(cat as Record<string, unknown>).length,
        0,
      );
    expect(count(doc.light)).toBe(Object.keys(globalTokens).length);
    expect(count(doc.dark)).toBe(Object.keys(darkTokens).length);
  });

  it('maps hsl color tokens to DTCG 2025.10 color values', () => {
    // 'color-primary': 'hsl(221 83% 53%)'
    expect(doc.light.color['primary']).toEqual({
      $type: 'color',
      $value: { colorSpace: 'hsl', components: [221, 83, 53], alpha: 1 },
    });
  });

  it('maps px radius tokens to DTCG dimension values', () => {
    expect(doc.light.radius['sm']).toEqual({
      $type: 'dimension',
      $value: { value: 4, unit: 'px' },
    });
  });

  it('maps font stacks to DTCG fontFamily arrays', () => {
    expect(doc.light.font['sans']).toEqual({
      $type: 'fontFamily',
      $value: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
    });
  });

  it('dark group carries the dark palette', () => {
    expect(doc.dark.color['bg']).toEqual({
      $type: 'color',
      $value: { colorSpace: 'hsl', components: [222, 47, 11], alpha: 1 },
    });
  });
});

describe('committed tokens.dtcg.json', () => {
  it('is in sync with the source tokens (regenerate with `pnpm tokens:dtcg`)', () => {
    const committed = JSON.parse(readFileSync(COMMITTED, 'utf8')) as unknown;
    expect(committed).toEqual(JSON.parse(JSON.stringify(toDtcg())));
  });
});
