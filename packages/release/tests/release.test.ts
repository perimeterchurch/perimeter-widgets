import { describe, it, expect } from 'vitest';
import {
  setManifestVersion,
  bundleRelPath,
  versionsToPrune,
  buildRewrites,
  compareVersions,
  nextVersion,
  releaseBranch,
  releasePrBody,
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

describe('nextVersion', () => {
  it('bumps patch/minor/major and zeroes lower parts', () => {
    expect(nextVersion('1.2.3', 'patch')).toBe('1.2.4');
    expect(nextVersion('1.2.3', 'minor')).toBe('1.3.0');
    expect(nextVersion('1.2.3', 'major')).toBe('2.0.0');
  });
  it('drops a prerelease suffix when bumping', () => {
    expect(nextVersion('1.2.0-abc', 'patch')).toBe('1.2.1');
  });
  it('throws on a non-numeric version', () => {
    expect(() => nextVersion('x.y.z', 'patch')).toThrow();
  });
});

describe('releaseBranch', () => {
  it('is deterministic and git-ref-safe', () => {
    expect(releaseBranch('event-list', '1.3.0')).toBe('release/event-list-1.3.0');
  });
});

describe('releasePrBody', () => {
  it('includes name, version, and bundle size', () => {
    const body = releasePrBody({ name: 'sermons', version: '1.0.2', gzBytes: 864400 });
    expect(body).toContain('sermons@1.0.2');
    expect(body).toMatch(/844(\.\d+)?\s*KiB|864400/); // size shown in some human form
  });
});
