import { describe, it, expect } from 'vitest';
import { createStore } from '../src/store';
import { createMemoryKv, createMemoryBlob } from '../src/drivers/memory';
import type { BuildRecord } from '../src/types';

const rec = (version: string): BuildRecord => ({
  version,
  sha: version.slice(-7),
  sizeGz: 100,
  builtAt: '2026-05-27T00:00:00.000Z',
  blobPath: `sermons/${version}/index.js`,
});

function freshStore() {
  return createStore(createMemoryKv(), createMemoryBlob());
}

describe('createStore', () => {
  it('records builds newest-first and lists them', async () => {
    const s = freshStore();
    await s.recordBuild('sermons', rec('1.0.0'));
    await s.recordBuild('sermons', rec('1.1.0'));
    const builds = await s.listBuilds('sermons');
    expect(builds.map((b) => b.version)).toEqual(['1.1.0', '1.0.0']);
  });

  it('refuses a duplicate version (immutable paths)', async () => {
    const s = freshStore();
    await s.recordBuild('sermons', rec('1.0.0'));
    await expect(s.recordBuild('sermons', rec('1.0.0'))).rejects.toThrow(/already/i);
  });

  it('records publish activity', async () => {
    const s = freshStore();
    await s.recordBuild('sermons', rec('1.0.0'));
    const activity = await s.listActivity();
    expect(activity[0]).toMatchObject({
      action: 'publish',
      widget: 'sermons',
      version: '1.0.0',
      by: 'script',
    });
  });

  it('setLatest writes the pointer and an activity entry', async () => {
    const s = freshStore();
    await s.recordBuild('sermons', rec('1.0.0'));
    await s.setLatest('sermons', '1.0.0', 'promote', 'me@perimeter.org');
    expect(await s.getLatest('sermons')).toBe('1.0.0');
    const activity = await s.listActivity();
    expect(activity[0]).toMatchObject({
      action: 'promote',
      version: '1.0.0',
      by: 'me@perimeter.org',
    });
  });

  it('setLatest rejects a version that was never built', async () => {
    const s = freshStore();
    await expect(s.setLatest('sermons', '9.9.9', 'promote', 'me')).rejects.toThrow(
      /not.*built|unknown/i,
    );
  });

  it('getLatest returns null when never promoted', async () => {
    const s = freshStore();
    expect(await s.getLatest('sermons')).toBeNull();
  });

  it('caps the activity log at 200 entries, newest first', async () => {
    const s = freshStore();
    for (let i = 0; i < 205; i++) await s.recordBuild('w', rec(`1.0.${i}`));
    const activity = await s.listActivity();
    expect(activity).toHaveLength(200);
    expect(activity[0]?.version).toBe('1.0.204');
    expect(activity[199]?.version).toBe('1.0.5');
  });

  it('uploadBundle + readBundle round-trips through blob', async () => {
    const s = freshStore();
    await s.uploadBundle('sermons/1.0.0/index.js', Buffer.from('js'), 'application/javascript');
    const stream = await s.readBundle('sermons/1.0.0/index.js');
    expect(await new Response(stream).text()).toBe('js');
  });
});
