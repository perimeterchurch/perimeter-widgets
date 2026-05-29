import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const BUNDLE = path.resolve(__dirname, '../../../dist/sermons/sermons.iife.js');
// Per-widget gzipped budget for the sermons IIFE. Set at 680 KB after measuring
// the real port (~644 KB gz; the legacy production widget was already 554 KB gz).
// The single-file IIFE bundles React, ReactDOM, TanStack Query, nuqs,
// framer-motion, hls.js, and react-pdf (pdf.js) together, so this is the gate.
// A follow-up optimization task tracks trimming the ~75 KB-gz growth over legacy.
const BUDGET_BYTES = 680 * 1024;

describe('sermons bundle', () => {
  it('is under the 680 KB gzipped budget', async () => {
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
