import { describe, expect, it } from 'vitest';
import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { compileDevCss, compileProdCss, repoRoot } from '../src/pipelines.ts';
import { diffCss } from '../src/diff.ts';
import { uiAttributableSelectors } from '../src/ui-selectors.ts';

const widgets = readdirSync(path.join(repoRoot, 'widgets')).filter((n) =>
  existsSync(path.join(repoRoot, 'widgets', n, 'tailwind.config.ts')),
);

describe('css pipeline parity (permanent gate — see audits/2026-06-02-parity-audit-findings.md)', () => {
  it('found at least the known widgets', () => {
    expect(widgets).toEqual(expect.arrayContaining(['example', 'sermons']));
  });

  it.each(widgets)(
    '%s: shipped CSS diverges from studio CSS in zero meaningful ways',
    async (name) => {
      const dir = path.join(repoRoot, 'widgets', name);
      const [dev, prod] = await Promise.all([compileDevCss(dir), compileProdCss(dir)]);
      const d = diffCss(dev, prod);
      // H2: no @perimeter/ui class may be missing from the shipped bundle.
      expect(await uiAttributableSelectors(d.onlyInA)).toEqual([]);
      // H1: studio and prod both run rem→px now — zero unit drift, zero other value drift.
      expect(d.valueDiffs).toEqual([]);
      // The shipped bundle must never contain rules the studio doesn't render.
      expect(d.onlyInB).toEqual([]);
      // NOT asserted: d.onlyInA == [] — dev is a legitimate superset (studio chrome,
      // other widgets' classes); H2-attribution is the meaningful subset gate.
    },
    120_000,
  );
});
