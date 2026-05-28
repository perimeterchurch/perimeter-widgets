import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore, createMemoryKv, createMemoryBlob } from '@perimeter/release-store';

const memory = createStore(createMemoryKv(), createMemoryBlob());
vi.mock('@/lib/store', () => ({ releaseStore: () => memory }));

beforeEach(async () => {
  await memory.uploadBundle('sermons/1.0.0/index.js', Buffer.from('BUNDLE'), 'application/javascript');
  await memory.uploadBundle('sermons/1.0.0/index.js.map', Buffer.from('SOURCEMAP'), 'application/json');
});

describe('GET /api/bundle/[name]/[version]', () => {
  it('streams the immutable bundle with the 1-year cache header', async () => {
    const { GET } = await import('@/app/api/bundle/[name]/[version]/route');
    const res = await GET(new Request('https://widgets.perimeter.org/sermons/1.0.0/index.js'), {
      params: Promise.resolve({ name: 'sermons', version: '1.0.0' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(res.headers.get('content-type')).toBe('application/javascript; charset=utf-8');
    expect(await res.text()).toBe('BUNDLE');
  });

  it('404s an unknown version', async () => {
    const { GET } = await import('@/app/api/bundle/[name]/[version]/route');
    const res = await GET(new Request('https://x/sermons/9.9.9/index.js'), {
      params: Promise.resolve({ name: 'sermons', version: '9.9.9' }),
    });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/bundle-map/[name]/[version]', () => {
  it('streams the immutable sourcemap with the 1-year cache header', async () => {
    const { GET } = await import('@/app/api/bundle-map/[name]/[version]/route');
    const res = await GET(new Request('https://widgets.perimeter.org/sermons/1.0.0/index.js.map'), {
      params: Promise.resolve({ name: 'sermons', version: '1.0.0' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(await res.text()).toBe('SOURCEMAP');
  });

  it('404s an unknown version', async () => {
    const { GET } = await import('@/app/api/bundle-map/[name]/[version]/route');
    const res = await GET(new Request('https://x/sermons/9.9.9/index.js.map'), {
      params: Promise.resolve({ name: 'sermons', version: '9.9.9' }),
    });
    expect(res.status).toBe(404);
  });
});
