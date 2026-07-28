import { describe, expect, it } from 'vitest';
import { globalTokens, darkTokens } from '../src/tokens';

/**
 * WCAG AA contrast guards for the token palettes (4.5:1 for normal text). The
 * 2026-06-10 axe sweep caught light `color-muted-fg` at ~4.3:1 over muted
 * surfaces — passing on pure white but failing on `bg-muted` and on the
 * `bg-muted/60`-over-white chips widgets actually render it on. These tests pin
 * the REAL surfaces muted-fg text sits on so a future palette tweak cannot
 * silently regress below AA.
 */

/** Parse this repo's token format: `hsl(H S% L%)` (space-separated, no alpha). */
function parseHsl(value: string): { h: number; s: number; l: number } {
  const m = value.match(/^hsl\((\d+(?:\.\d+)?) (\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%\)$/);
  if (!m) throw new Error(`not a parseable hsl token: ${value}`);
  return { h: Number(m[1]), s: Number(m[2]) / 100, l: Number(m[3]) / 100 };
}

function hslToRgb({ h, s, l }: { h: number; s: number; l: number }): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const seg =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [(seg[0]! + m) * 255, (seg[1]! + m) * 255, (seg[2]! + m) * 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(fg: [number, number, number], bg: [number, number, number]): number {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Source-over composite of a color at `alpha` onto an opaque backdrop. */
function over(
  fg: [number, number, number],
  alpha: number,
  bg: [number, number, number],
): [number, number, number] {
  return [
    fg[0] * alpha + bg[0] * (1 - alpha),
    fg[1] * alpha + bg[1] * (1 - alpha),
    fg[2] * alpha + bg[2] * (1 - alpha),
  ];
}

const rgb = (token: string) => hslToRgb(parseHsl(token));

describe('light palette muted-fg meets WCAG AA (4.5:1) on its real surfaces', () => {
  const mutedFg = rgb(globalTokens['color-muted-fg']);
  const bg = rgb(globalTokens['color-bg']);
  const muted = rgb(globalTokens['color-muted']);

  it('on the widget surface (color-bg)', () => {
    expect(contrast(mutedFg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('on a full muted surface (color-muted)', () => {
    expect(contrast(mutedFg, muted)).toBeGreaterThanOrEqual(4.5);
  });

  it('on a bg-muted/60 chip composited over the surface (MediaCard meta chips)', () => {
    expect(contrast(mutedFg, over(muted, 0.6, bg))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('dark palette muted-fg meets WCAG AA (4.5:1) on its real surfaces', () => {
  const mutedFg = rgb(darkTokens['color-muted-fg']);
  const bg = rgb(darkTokens['color-bg']);
  const muted = rgb(darkTokens['color-muted']);

  it('on the widget surface (color-bg)', () => {
    expect(contrast(mutedFg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('on a full muted surface (color-muted)', () => {
    expect(contrast(mutedFg, muted)).toBeGreaterThanOrEqual(4.5);
  });

  it('on a bg-muted/60 chip composited over the surface', () => {
    expect(contrast(mutedFg, over(muted, 0.6, bg))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('primary foreground pairings stay AA', () => {
  for (const [name, tokens] of [
    ['light', globalTokens],
    ['dark', darkTokens],
  ] as const) {
    it(`${name}: fg on bg`, () => {
      expect(contrast(rgb(tokens['color-fg']), rgb(tokens['color-bg']))).toBeGreaterThanOrEqual(
        4.5,
      );
    });
    it(`${name}: primary-fg on primary`, () => {
      expect(
        contrast(rgb(tokens['color-primary-fg']), rgb(tokens['color-primary'])),
      ).toBeGreaterThanOrEqual(4.5);
    });
    // The warning pair renders at text-xs (12px) inside Badge, so it needs the
    // 4.5:1 normal-text ratio — the 3:1 large-text allowance does not apply.
    it(`${name}: warning-fg on warning`, () => {
      expect(
        contrast(rgb(tokens['color-warning-fg']), rgb(tokens['color-warning'])),
      ).toBeGreaterThanOrEqual(4.5);
    });
  }
});
