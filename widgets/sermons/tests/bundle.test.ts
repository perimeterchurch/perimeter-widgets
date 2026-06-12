import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const bundle = path.join(distDir, 'index.js');
// Lowered from 900 after the pdf-worker split: the worker (~288 KB gz) ships
// as a sibling dist artifact, not bundle bytes. The tightened budget is the
// regression lock — it fails if the worker ever creeps back into the IIFE.
const BUDGET_GZ = 600 * 1024;

beforeAll(() => {
  // Vitest exports NODE_ENV=test, and Vite respects a pre-set NODE_ENV — the
  // child build would silently use the DEV jsx transform and ship a bundle
  // that crashes on real pages (_.jsxDEV is not a function). Pin production.
  execSync('pnpm exec vite build', {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  });
}, 180_000);

describe('built sermons bundle', () => {
  it('emits a single IIFE at dist/index.js', () => {
    expect(existsSync(bundle)).toBe(true);
  });
  it('inlines CSS — no separate .css asset is emitted', () => {
    expect(readdirSync(distDir).some((f) => f.endsWith('.css'))).toBe(false);
  });
  it('self-mounts and embeds the version', () => {
    const code = readFileSync(bundle, 'utf8');
    expect(code).toContain('sermons');
    expect(code).toContain('PerimeterWidgets');
  });
  it('is a production-transform build (no dev JSX runtime)', () => {
    // jsxDEV in the bundle means a non-production NODE_ENV leaked into the
    // build — the artifact crashes at runtime under the production define.
    expect(readFileSync(bundle, 'utf8')).not.toContain('jsxDEV');
  });
  it('emits the pdf.js worker as a sibling artifact', () => {
    expect(existsSync(path.join(distDir, 'pdf.worker.min.mjs'))).toBe(true);
  });
  it('stays within the 600 KB gz budget', () => {
    const gz = gzipSync(readFileSync(bundle)).length;
    // Surface the measured size in the test output regardless of pass/fail.
    console.log(
      `sermons bundle: ${(gz / 1024).toFixed(1)} KB gz (budget ${(BUDGET_GZ / 1024).toFixed(0)} KB)`,
    );
    expect(gz).toBeLessThanOrEqual(BUDGET_GZ);
  });
});
