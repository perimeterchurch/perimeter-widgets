import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const BUNDLE = path.resolve(__dirname, '../../../dist/sermons/sermons.iife.js');
// Per-widget gzipped budget for the sermons IIFE. Raised to 850 KB after the
// pdf.js worker was inlined into the bundle (Phase 3 follow-up #8) — previously
// the worker was fetched from unpkg at runtime so it wasn't on the bundle's
// books. The current bundle measures ~801 KB gz; the headroom covers small
// future additions. A follow-up optimization could move the worker back to
// a self-hosted same-origin URL with CORS once the CDN supports it, dropping
// the bundle back into the 500-600 KB range.
const BUDGET_BYTES = 850 * 1024;

describe('sermons bundle', () => {
  it('is under the 850 KB gzipped budget', async () => {
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
