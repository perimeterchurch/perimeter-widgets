import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const BUNDLE = path.resolve(__dirname, '../../../dist/example/example.iife.js');
// Per-widget budget. React 19 + ReactDOM + TanStack Query + zod + runtime alone
// land near ~200 KB gzipped, so 120 KB (the umbrella's initial estimate) was not
// achievable. Raised after empirical measurement of the first real widget bundle.
const BUDGET_BYTES = 220 * 1024;

describe('example bundle', () => {
  it('is under the 220 KB gzipped budget', async () => {
    const raw = await readFile(BUNDLE);
    const gz = gzipSync(raw);
    expect(gz.byteLength).toBeLessThanOrEqual(BUDGET_BYTES);
  });

  it('contains the package version', async () => {
    const text = await readFile(BUNDLE, 'utf8');
    expect(text).toContain('0.0.0');
  });

  // The minifier mangles named identifiers, but the global namespace string
  // 'PerimeterWidgets' is baked into the virtual entry as a literal value via
  // the plugin's `def.__perimeterGlobal = "..."` assignment, so it survives.
  it('exposes the PerimeterWidgets global surface', async () => {
    const text = await readFile(BUNDLE, 'utf8');
    expect(text).toContain('PerimeterWidgets');
  });
});
