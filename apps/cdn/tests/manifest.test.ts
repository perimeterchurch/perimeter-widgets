import { describe, it, expect, vi } from 'vitest';
import { createStore, createMemoryKv, createMemoryBlob } from '@perimeter/release-store';

const memory = createStore(createMemoryKv(), createMemoryBlob());
vi.mock('@/lib/store', () => ({ releaseStore: () => memory }));

describe('GET /api/manifest', () => {
  it('lists only promoted widgets as name → latest.js URLs', async () => {
    await memory.recordBuild('sermons', {
      version: '1.0.0',
      sha: 'x',
      sizeGz: 1,
      builtAt: 't',
      blobPath: 'sermons/1.0.0/index.js',
    });
    await memory.setLatest('sermons', '1.0.0', 'promote', 'me');
    const { GET } = await import('@/app/api/manifest/route');
    const res = await GET();
    expect(res.headers.get('cache-control')).toBe(
      'public, s-maxage=300, stale-while-revalidate=86400',
    );
    expect(await res.json()).toEqual({ sermons: '/sermons/latest.js' });
  });
});
