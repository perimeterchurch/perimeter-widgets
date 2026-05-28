import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore, createMemoryKv, createMemoryBlob } from '@perimeter/release-store';

const memory = createStore(createMemoryKv(), createMemoryBlob());
vi.mock('@/lib/store', () => ({ releaseStore: () => memory }));

const build = (v: string) => ({ version: v, sha: 'x', sizeGz: 1, builtAt: 't', blobPath: `sermons/${v}/index.js` });

describe('GET /api/latest/[name]', () => {
  beforeEach(async () => {
    const builds = await memory.listBuilds('sermons');
    if (!builds.some((b) => b.version === '1.0.0')) {
      await memory.recordBuild('sermons', build('1.0.0'));
    }
  });

  it('302-redirects to the live versioned URL with the pointer cache header', async () => {
    await memory.setLatest('sermons', '1.0.0', 'promote', 'me');
    const { GET } = await import('@/app/api/latest/[name]/route');
    const res = await GET(new Request('https://widgets.perimeter.org/sermons/latest.js'), {
      params: Promise.resolve({ name: 'sermons' }),
    });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/sermons/1.0.0/index.js');
    expect(res.headers.get('cache-control')).toBe('public, s-maxage=300, stale-while-revalidate=86400');
  });

  it('404s when the widget was never promoted', async () => {
    const { GET } = await import('@/app/api/latest/[name]/route');
    const res = await GET(new Request('https://x/events/latest.js'), {
      params: Promise.resolve({ name: 'events' }),
    });
    expect(res.status).toBe(404);
  });
});
