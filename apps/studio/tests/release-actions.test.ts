import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore, createMemoryKv, createMemoryBlob } from '@perimeter/release-store';

const memory = createStore(createMemoryKv(), createMemoryBlob());
vi.mock('@/lib/release-store', () => ({ releaseStore: () => memory }));

const getSession = vi.fn();
vi.mock('@/lib/auth/better-auth', () => ({ auth: { api: { getSession } } }));
vi.mock('next/headers', () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

beforeEach(async () => {
  getSession.mockReset();
  const builds = await memory.listBuilds('sermons');
  if (!builds.some((b) => b.version === '1.0.0')) {
    await memory.recordBuild('sermons', { version: '1.0.0', sha: 'x', sizeGz: 1, builtAt: 't', blobPath: 'sermons/1.0.0/index.js' });
  }
});

describe('promote action', () => {
  it('rejects when there is no session', async () => {
    getSession.mockResolvedValue(null);
    const { promote } = await import('@/app/admin/releases/actions');
    await expect(promote('sermons', '1.0.0')).rejects.toThrow(/unauthorized/i);
  });

  it('promotes and records the session email as `by`', async () => {
    getSession.mockResolvedValue({ user: { email: 'me@perimeter.org' } });
    const { promote } = await import('@/app/admin/releases/actions');
    await promote('sermons', '1.0.0');
    expect(await memory.getLatest('sermons')).toBe('1.0.0');
    const activity = await memory.listActivity();
    expect(activity[0]).toMatchObject({ action: 'promote', by: 'me@perimeter.org' });
  });
});

describe('rollback action', () => {
  it('rejects when there is no session', async () => {
    getSession.mockResolvedValue(null);
    const { rollback } = await import('@/app/admin/releases/actions');
    await expect(rollback('sermons', '1.0.0')).rejects.toThrow(/unauthorized/i);
  });

  it('records the activity entry as a rollback', async () => {
    getSession.mockResolvedValue({ user: { email: 'me@perimeter.org' } });
    const { rollback } = await import('@/app/admin/releases/actions');
    await rollback('sermons', '1.0.0');
    const activity = await memory.listActivity();
    expect(activity[0]).toMatchObject({ action: 'rollback', by: 'me@perimeter.org' });
  });
});
