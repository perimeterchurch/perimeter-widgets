import { describe, it, expect } from 'vitest';
import type { BuildRecord, ActivityEntry } from '../src/types.ts';

describe('release-store types', () => {
  it('constructs a BuildRecord (optional prUrl omitted)', () => {
    const b: BuildRecord = {
      version: '1.4.2',
      sha: 'abc1234',
      sizeGz: 1234,
      builtAt: '2026-05-27T00:00:00.000Z',
      blobPath: 'sermons/1.4.2/index.js',
    };
    expect(b.version).toBe('1.4.2');
  });

  it('constructs an ActivityEntry', () => {
    const a: ActivityEntry = {
      action: 'promote',
      widget: 'sermons',
      version: '1.4.2',
      at: '2026-05-27T00:00:00.000Z',
      by: 'user@perimeter.org',
    };
    expect(a.action).toBe('promote');
  });
});
