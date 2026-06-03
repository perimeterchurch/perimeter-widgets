import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const bundle = path.join(distDir, 'index.js');

beforeAll(() => {
  execSync('pnpm exec vite build', { cwd: root, stdio: 'inherit' });
}, 120_000);

describe('built __NAME__ bundle', () => {
  it('emits a single IIFE at dist/index.js', () => {
    expect(existsSync(bundle)).toBe(true);
  });
  it('inlines CSS — no separate .css asset is emitted', () => {
    expect(readdirSync(distDir).some((f) => f.endsWith('.css'))).toBe(false);
  });
  it('self-mounts: bundle references the widget name and PerimeterWidgets global', () => {
    const code = readFileSync(bundle, 'utf8');
    expect(code).toContain('__NAME__');
    expect(code).toContain('PerimeterWidgets');
  });
});
