import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRewrites, type Manifest } from '../src/release';

const cdn = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../cdn');
const read = (f: string): unknown => JSON.parse(readFileSync(path.join(cdn, f), 'utf8'));

describe('cdn/vercel.json stays in sync with the manifest', () => {
  const manifest = read('manifest.json') as Manifest;
  const vercel = read('vercel.json') as {
    rewrites: { source: string; destination: string }[];
    headers: { source: string; headers: { key: string; value: string }[] }[];
  };

  it('rewrites match buildRewrites(manifest)', () => {
    expect(vercel.rewrites).toEqual(buildRewrites(manifest));
  });
  it('versioned bundles are immutable-cached', () => {
    const all = vercel.headers.flatMap((h) => h.headers.map((x) => x.value));
    expect(all.some((v) => v.includes('immutable'))).toBe(true);
  });
  it('the manifest pointer uses stale-while-revalidate', () => {
    const m = vercel.headers.find((h) => h.source === '/manifest.json');
    expect(m?.headers.some((x) => x.value.includes('stale-while-revalidate'))).toBe(true);
  });
});
