import { describe, it, expect } from 'vitest';
import { PrayerWallConfigSchema } from '../src/types';
// Static, not `await import(...)` inside each test: loading this pulls in the
// whole App tree, and the test that imported it first paid that cost against
// the 5s test timeout — which it exceeded under a fully uncached parallel
// monorepo run. At file scope the work happens in vitest's import phase,
// which is not timed.
import widget from '../src/widget';

describe('PrayerWallConfigSchema', () => {
  it('defaults to the wall the church is already running', () => {
    const config = PrayerWallConfigSchema.parse({});
    expect(config.formTitle).toBe('I have a Prayer or Praise Request');
    expect(config.feedTitle).toBe('Recent Prayers & Praise');
    expect(config.showForm).toBe(true);
    expect(config.showFeed).toBe(true);
    expect(config.days).toBe(60);
    expect(config.perPage).toBe(8);
    expect(config.recaptchaSiteKey).toBe('6LfJFoYtAAAAAChdFF8MhIv7ma3l7xG2bJDQdzvk');
    expect(config.apiUrl).toBeUndefined();
  });

  it('coerces the numeric data-* attributes, which arrive as strings', () => {
    const config = PrayerWallConfigSchema.parse({ days: '30', perPage: '4' });
    expect(config.days).toBe(30);
    expect(config.perPage).toBe(4);
  });

  it('caps the window at a year and the page size at 50, matching the endpoint', () => {
    expect(() => PrayerWallConfigSchema.parse({ days: '400' })).toThrow();
    expect(() => PrayerWallConfigSchema.parse({ perPage: '100' })).toThrow();
  });

  it('takes the booleans the data-attr layer has already normalized', () => {
    const config = PrayerWallConfigSchema.parse({ showForm: false, showFeed: true });
    expect(config.showForm).toBe(false);
    expect(config.showFeed).toBe(true);
  });
});

describe('widget definition', () => {
  it('renders as rectangles — Perimeter has no corner radius', () => {
    expect(widget.themeOverrides).toEqual({
      'radius-sm': '0px',
      'radius-md': '0px',
      'radius-lg': '0px',
    });
  });

  it('leaves auth optional, so the feed stays public', () => {
    expect(widget.auth).toBe('optional');
  });
});
