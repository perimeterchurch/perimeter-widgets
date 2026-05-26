import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { build } from 'vite';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { perimeterWidget } from '../src/plugin';

describe('perimeterWidget plugin', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'perimeter-widget-'));
    await mkdir(path.join(dir, 'src'), { recursive: true });
    await writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'fixture-widget', version: '4.5.6', type: 'module' }),
    );
    await writeFile(
      path.join(dir, 'src', 'index.ts'),
      `export default { name: 'fixture', auth: 'none', schema: { parse: (x) => x }, App: () => null };`,
    );
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('emits a single IIFE bundle named after the widget name, with the version baked in', async () => {
    await build({ root: dir, logLevel: 'silent', plugins: [perimeterWidget({ name: 'fixture' })] });
    const out = await readFile(path.join(dir, 'dist', 'fixture.iife.js'), 'utf8');
    expect(out).toContain('4.5.6');
    expect(out).toMatch(/^\(function/);
  });

  it('honors a custom globalName option', async () => {
    await build({
      root: dir,
      logLevel: 'silent',
      plugins: [perimeterWidget({ name: 'fixture', globalName: 'MyGlobal' })],
    });
    const out = await readFile(path.join(dir, 'dist', 'fixture.iife.js'), 'utf8');
    expect(out).toContain('MyGlobal');
  });

  it('inlines processed CSS into the JS chunk and emits no standalone CSS asset', async () => {
    await writeFile(
      path.join(dir, 'src', 'styles.css'),
      `.perimeter-fixture-css-sentinel { color: red; }`,
    );
    await writeFile(
      path.join(dir, 'src', 'index.ts'),
      `import './styles.css';
       export default { name: 'fixture', auth: 'none', schema: { parse: (x) => x }, App: () => null };`,
    );
    await build({ root: dir, logLevel: 'silent', plugins: [perimeterWidget({ name: 'fixture' })] });
    const out = await readFile(path.join(dir, 'dist', 'fixture.iife.js'), 'utf8');
    expect(out).toContain('perimeter-fixture-css-sentinel');
    const files = await readdir(path.join(dir, 'dist'));
    expect(files.some((f) => f.endsWith('.css'))).toBe(false);
  });
});
