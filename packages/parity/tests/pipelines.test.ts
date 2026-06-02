import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { compileDevCss, compileProdCss, repoRoot } from '../src/pipelines.ts';

const example = path.join(repoRoot, 'widgets/example');

describe('css pipelines', () => {
  it('prod pipeline emits px (rem→px applied)', async () => {
    const css = await compileProdCss(example);
    expect(css).not.toMatch(/[\d.]rem\b/);
    // Assert on a utility the widget's OWN source guarantees (app.tsx uses p-4).
    // Do NOT assert `--color-` here: the widget's tailwind content scans only its
    // own src, and example's color utilities live inside @perimeter/ui — their
    // absence from prod CSS is the H2 finding itself, not a harness bug.
    expect(css).toMatch(/\.p-4\s*\{[^}]*padding:\s*16px/);
  }, 60_000);

  it('dev pipeline compiles the same source through the studio config', async () => {
    const css = await compileDevCss(example);
    // The studio config scans packages/ui/src, so ui-component color utilities
    // (var(--color-…) references) ARE generated in dev — the other half of H2.
    expect(css).toContain('var(--color-');
    expect(css).toMatch(/\.p-4\s*\{[^}]*padding:\s*1rem/); // and no rem→px in dev (H1)
  }, 60_000);
});
