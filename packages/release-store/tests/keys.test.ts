import { describe, it, expect } from 'vitest';
import { latestKey, buildsKey, ACTIVITY_KEY } from '../src/keys';

describe('kv keys', () => {
  it('builds per-widget keys', () => {
    expect(latestKey('sermons')).toBe('latest:sermons');
    expect(buildsKey('sermons')).toBe('builds:sermons');
  });
  it('has a single activity key', () => {
    expect(ACTIVITY_KEY).toBe('activity');
  });
});
