import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const bundle = path.join(distDir, 'index.js');

beforeAll(() => {
  // Vitest exports NODE_ENV=test, and Vite respects a pre-set NODE_ENV — the
  // child build would silently use the DEV jsx transform and ship a bundle
  // that crashes on real pages (_.jsxDEV is not a function). Pin production.
  execSync('pnpm exec vite build', {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  });
}, 120_000);

describe('built staff-directory bundle', () => {
  it('emits a single IIFE at dist/index.js', () => {
    expect(existsSync(bundle)).toBe(true);
  });
  it('inlines CSS — no separate .css asset is emitted', () => {
    expect(readdirSync(distDir).some((f) => f.endsWith('.css'))).toBe(false);
  });
  it('self-mounts: bundle references the widget name and PerimeterWidgets global', () => {
    const code = readFileSync(bundle, 'utf8');
    expect(code).toContain('staff-directory');
    expect(code).toContain('PerimeterWidgets');
  });
  it('is a production-transform build (no dev JSX runtime)', () => {
    // jsxDEV in the bundle means a non-production NODE_ENV leaked into the
    // build — the artifact crashes at runtime under the production define.
    expect(readFileSync(bundle, 'utf8')).not.toContain('jsxDEV');
  });
});
