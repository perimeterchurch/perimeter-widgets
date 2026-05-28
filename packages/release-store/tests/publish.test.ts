import { describe, it, expect } from 'vitest';
import { createStore, createMemoryKv, createMemoryBlob } from '../src/index';
import { publishWidget, computeVersion } from '../src/publish';

describe('computeVersion', () => {
  it('uses bare version on main', () => {
    expect(computeVersion('1.4.2', 'abc1234', 'main')).toBe('1.4.2');
  });
  it('appends short sha off main', () => {
    expect(computeVersion('1.4.2', 'abc1234', 'feature/x')).toBe('1.4.2-abc1234');
  });
});

describe('publishWidget', () => {
  it('builds, uploads bundle+map, and records the available build', async () => {
    const store = createStore(createMemoryKv(), createMemoryBlob());
    const result = await publishWidget(
      { name: 'sermons', force: false },
      {
        store,
        readPackageVersion: () => '1.4.2',
        gitSha: () => 'abc1234',
        gitBranch: () => 'main',
        build: async () => {},
        readArtifact: (p) => Buffer.from(p.endsWith('.map') ? 'MAP' : 'JS'),
      },
    );
    expect(result.version).toBe('1.4.2');
    expect(result.blobPath).toBe('sermons/1.4.2/index.js');

    const builds = await store.listBuilds('sermons');
    expect(builds[0]?.version).toBe('1.4.2');
    expect(builds[0]?.sizeGz).toBeGreaterThan(0);
    expect(await store.getLatest('sermons')).toBeNull(); // available, NOT live

    const js = await store.readBundle('sermons/1.4.2/index.js');
    expect(await new Response(js).text()).toBe('JS');
    const map = await store.readBundle('sermons/1.4.2/index.js.map');
    expect(await new Response(map).text()).toBe('MAP');
  });

  it('refuses to republish an existing version', async () => {
    const store = createStore(createMemoryKv(), createMemoryBlob());
    const hooks = {
      store,
      readPackageVersion: () => '1.4.2',
      gitSha: () => 'abc1234',
      gitBranch: () => 'main',
      build: async () => {},
      readArtifact: () => Buffer.from('JS'),
    };
    await publishWidget({ name: 'sermons', force: false }, hooks);
    await expect(publishWidget({ name: 'sermons', force: false }, hooks)).rejects.toThrow(/already/i);
  });
});
