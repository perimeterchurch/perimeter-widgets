import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startEmbedLab } from '../src/serve.ts';

const repoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');

let server: Server;
let base: string;

beforeAll(async () => {
  server = startEmbedLab(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  server.close();
});

describe('embed lab server', () => {
  it('serves the lab index at /', async () => {
    const res = await fetch(`${base}/`);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain('Embed Lab');
  });

  it('serves the test pages', async () => {
    for (const page of ['basic', 'dark', 'hostile-host', 'canary', 'multi', 'local']) {
      const res = await fetch(`${base}/pages/${page}.html`);
      expect(res.status, page).toBe(200);
    }
  });

  it('passes the real committed loader through', async () => {
    const res = await fetch(`${base}/loader.js`);
    expect(res.headers.get('content-type')).toContain('text/javascript');
    const js = await res.text();
    expect(js).toContain('data-perimeter-widget');
    expect(js).toContain('data-perimeter-version'); // the canary override shipped in #125
  });

  it('serves the released bundle the manifest points at', async () => {
    const manifest = JSON.parse(
      readFileSync(path.join(repoRoot, 'cdn/manifest.json'), 'utf8'),
    ) as Record<string, string>;
    const res = await fetch(`${base}/sermons/${manifest.sermons}/index.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('explains how to build when a local dist is missing', async () => {
    const res = await fetch(`${base}/local/nope/index.js`);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('pnpm --filter @perimeter/widget-nope build');
  });

  it('refuses path traversal out of the served roots', async () => {
    const res = await fetch(`${base}/..%2Fpackage.json`);
    expect(res.status).toBe(404);
  });
});
