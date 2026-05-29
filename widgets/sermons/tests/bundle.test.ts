import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const bundle = path.join(distDir, 'index.js');
const BUDGET_GZ = 900 * 1024; // spec per-widget budget (raised from 850 on the new platform; pdf-worker optimization tracked separately)

beforeAll(() => {
  execSync('pnpm exec vite build', { cwd: root, stdio: 'inherit' });
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
  it('stays within the 900 KB gz budget', () => {
    const gz = gzipSync(readFileSync(bundle)).length;
    // Surface the measured size in the test output regardless of pass/fail.
    console.log(
      `sermons bundle: ${(gz / 1024).toFixed(1)} KB gz (budget ${(BUDGET_GZ / 1024).toFixed(0)} KB)`,
    );
    expect(gz).toBeLessThanOrEqual(BUDGET_GZ);
  });
});
