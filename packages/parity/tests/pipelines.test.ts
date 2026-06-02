import { describe, expect, it } from 'vitest';
import path from 'node:path';
import postcss from 'postcss';
import { compileDevCss, compileProdCss, repoRoot } from '../src/pipelines.ts';

const example = path.join(repoRoot, 'widgets/example');

/** rem found in actual declaration VALUES — what rem→px is meant to convert.
 * (Tailwind arbitrary-value class names like `ml-[-0.3rem]` carry `rem` in the
 * SELECTOR; that is a class-name token, not a length that scales against host
 * font-size, so it is out of remToPxPlugin's scope and must be ignored here.) */
function remInDeclarationValues(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkDecls((d) => {
    if (/[\d.]rem\b/.test(d.value)) out.push(`${d.prop}: ${d.value}`);
  });
  return out;
}

describe('css pipelines', () => {
  it('prod pipeline emits px (rem→px applied)', async () => {
    const css = await compileProdCss(example);
    expect(remInDeclarationValues(css)).toEqual([]);
    // Assert on a utility the widget's OWN source guarantees (app.tsx uses p-4).
    expect(css).toMatch(/\.p-4\s*\{[^}]*padding:\s*16px/);
    // Since the H2 fix, the widget content scans packages/ui/src, so the color
    // utilities used inside @perimeter/ui components ship in the prod bundle too.
    expect(css).toContain('var(--color-');
  }, 60_000);

  it('dev pipeline compiles the same source through the studio config', async () => {
    const css = await compileDevCss(example);
    // The studio config scans packages/ui/src, so ui-component color utilities
    // (var(--color-…) references) ARE generated in dev — the other half of H2.
    expect(css).toContain('var(--color-');
    expect(css).toMatch(/\.p-4\s*\{[^}]*padding:\s*1rem/); // and no rem→px in dev (H1)
  }, 60_000);
});
