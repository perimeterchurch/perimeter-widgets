import { describe, it, expect } from 'vitest';
import { getStore } from '../src/drivers/env';

describe('getStore', () => {
  it('returns a working store when RELEASE_STORE_DRIVER=memory', async () => {
    const s = getStore({ RELEASE_STORE_DRIVER: 'memory' });
    await s.uploadBundle('w/1/index.js', Buffer.from('x'), 'application/javascript');
    expect(await s.getLatest('w')).toBeNull();
  });

  it('memory store is isolated per call', async () => {
    const a = getStore({ RELEASE_STORE_DRIVER: 'memory' });
    const b = getStore({ RELEASE_STORE_DRIVER: 'memory' });
    await a.recordBuild('w', {
      version: '1.0.0', sha: 'x', sizeGz: 1, builtAt: 't', blobPath: 'w/1.0.0/index.js',
    });
    expect(await b.listBuilds('w')).toHaveLength(0);
  });
});
