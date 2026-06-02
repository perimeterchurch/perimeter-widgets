import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { startFixtureServer } from '../src/serve-fixture.ts';

let server: Server;
let base: string;

beforeAll(async () => {
  server = startFixtureServer(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  server.close();
});

describe('fixture server', () => {
  it('lists built widgets in the manifest', async () => {
    const res = await fetch(`${base}/manifest.json`);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const manifest = (await res.json()) as Record<string, string>;
    // widgets/example must be built (`pnpm --filter ./widgets/example build`)
    // before this test runs; the manifest only lists widgets with a dist/index.js.
    expect(manifest.example).toBe('dev');
  });

  it('serves the fixture page with the widget name substituted', async () => {
    const res = await fetch(`${base}/example.html`);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('data-perimeter-widget="example"');
    expect(html).not.toContain('__WIDGET__');
  });

  it('serves the real loader.js', async () => {
    const res = await fetch(`${base}/loader.js`);
    expect(res.headers.get('content-type')).toContain('text/javascript');
    const js = await res.text();
    expect(js).toContain('data-perimeter-widget');
  });

  it('serves the freshly built bundle at /<name>/dev/index.js', async () => {
    const res = await fetch(`${base}/example/dev/index.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/javascript');
  });
});
