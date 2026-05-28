import { describe, it, expect, vi, beforeAll } from 'vitest';
import {
  createStore,
  createMemoryKv,
  createMemoryBlob,
  publishWidget,
} from '@perimeter/release-store';

const memory = createStore(createMemoryKv(), createMemoryBlob());
vi.mock('@/lib/store', () => ({ releaseStore: () => memory }));

beforeAll(async () => {
  // publish 1.0.0 and 1.1.0 via the orchestration with injected hooks
  for (const version of ['1.0.0', '1.1.0']) {
    await publishWidget(
      { name: 'sermons', force: false },
      {
        store: memory,
        readPackageVersion: () => version,
        gitSha: () => version.replace(/\./g, '').padStart(7, '0'),
        gitBranch: () => 'main',
        build: async () => {},
        readArtifact: (p) => Buffer.from(p.endsWith('.map') ? 'MAP' : `JS-${version}`),
      },
    );
  }
});

describe('hosting lifecycle', () => {
  it('serves nothing until promoted, then 302s to the promoted version, then rolls back', async () => {
    const latest = await import('@/app/api/latest/[name]/route');
    const manifest = await import('@/app/api/manifest/route');

    // not live yet
    let res = await latest.GET(new Request('https://x/sermons/latest.js'), {
      params: Promise.resolve({ name: 'sermons' }),
    });
    expect(res.status).toBe(404);
    expect(await (await manifest.GET()).json()).toEqual({});

    // promote 1.1.0
    await memory.setLatest('sermons', '1.1.0', 'promote', 'me@perimeter.org');
    res = await latest.GET(new Request('https://x/sermons/latest.js'), {
      params: Promise.resolve({ name: 'sermons' }),
    });
    expect(res.headers.get('location')).toBe('/sermons/1.1.0/index.js');
    expect(await (await manifest.GET()).json()).toEqual({ sermons: '/sermons/latest.js' });

    // rollback to 1.0.0
    await memory.setLatest('sermons', '1.0.0', 'rollback', 'me@perimeter.org');
    res = await latest.GET(new Request('https://x/sermons/latest.js'), {
      params: Promise.resolve({ name: 'sermons' }),
    });
    expect(res.headers.get('location')).toBe('/sermons/1.0.0/index.js');

    // the versioned bytes for both still exist
    const v100 = await import('@/app/api/bundle/[name]/[version]/route');
    const r = await v100.GET(new Request('https://x/sermons/1.0.0/index.js'), {
      params: Promise.resolve({ name: 'sermons', version: '1.0.0' }),
    });
    expect(await r.text()).toBe('JS-1.0.0');
  });
});
