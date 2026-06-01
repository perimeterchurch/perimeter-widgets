import { describe, it, expect } from 'vitest';
import {
  setManifestVersion,
  bundleRelPath,
  versionsToPrune,
  buildRewrites,
  compareVersions,
} from '../src/release';

describe('setManifestVersion', () => {
  it('adds/updates a name → version mapping immutably', () => {
    const next = setManifestVersion({ sermons: '1.0.0' }, 'example', '0.0.0');
    expect(next).toEqual({ sermons: '1.0.0', example: '0.0.0' });
    expect(setManifestVersion(next, 'sermons', '1.1.0').sermons).toBe('1.1.0');
  });
});

describe('bundleRelPath', () => {
  it('computes the immutable cdn path for a widget version', () => {
    expect(bundleRelPath('sermons', '1.2.0')).toBe('sermons/1.2.0/index.js');
  });
});

describe('compareVersions', () => {
  it('orders semver ascending, prerelease below its release', () => {
    const sorted = ['1.2.0', '1.0.0', '1.10.0', '1.2.0-abc1234'].sort(compareVersions);
    expect(sorted).toEqual(['1.0.0', '1.2.0-abc1234', '1.2.0', '1.10.0']);
  });
});

describe('versionsToPrune', () => {
  it('keeps the newest N, returns the rest (oldest) to delete', () => {
    const all = ['1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0', '1.5.0'];
    expect(versionsToPrune(all, 5)).toEqual(['1.0.0']);
  });
  it('returns nothing when at or under the keep count', () => {
    expect(versionsToPrune(['1.0.0', '1.1.0'], 5)).toEqual([]);
  });
});

describe('buildRewrites', () => {
  it('maps each widget /<name>/latest.js to its current versioned bundle', () => {
    expect(buildRewrites({ sermons: '1.1.0', example: '0.0.0' })).toEqual([
      { source: '/example/latest.js', destination: '/example/0.0.0/index.js' },
      { source: '/sermons/latest.js', destination: '/sermons/1.1.0/index.js' },
    ]);
  });
});
