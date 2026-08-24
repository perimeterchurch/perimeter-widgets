import { describe, it, expect } from 'vitest';
import { formatPrayerCount, formatSubmittedDate, pageWindow } from '../src/lib/format';
import { loadPrayedIds, rememberPrayedId } from '../src/lib/prayed';

describe('formatSubmittedDate', () => {
  it('reads the way the card has always read', () => {
    expect(formatSubmittedDate('2026-08-17T08:29:00.000-04:00')).toBe('Monday, August 17, 2026');
  });

  it('keeps a late-night request on the church calendar day, not the reader’s', () => {
    // 00:33 Eastern is still the 16th in Los Angeles; the wall says the 17th.
    expect(formatSubmittedDate('2026-08-17T00:33:00.000-04:00')).toBe('Monday, August 17, 2026');
  });

  it('shows nothing rather than "Invalid Date" for an unparseable timestamp', () => {
    expect(formatSubmittedDate('not-a-date')).toBe('');
  });
});

describe('formatPrayerCount', () => {
  it('singularizes one prayer', () => {
    expect(formatPrayerCount(1)).toBe('Prayed for 1 Time');
  });

  it('pluralizes the rest', () => {
    expect(formatPrayerCount(19)).toBe('Prayed for 19 Times');
  });
});

describe('pageWindow', () => {
  it('shows every page when there are few', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
  });

  it('opens on the first five of a deep feed', () => {
    expect(pageWindow(1, 40)).toEqual([1, 2, 3, 4, 5]);
  });

  it('centres on the current page in the middle of a feed', () => {
    expect(pageWindow(10, 40)).toEqual([8, 9, 10, 11, 12]);
  });

  it('stops sliding at the end rather than running past it', () => {
    expect(pageWindow(40, 40)).toEqual([36, 37, 38, 39, 40]);
  });

  it('never renders a pager for a single page', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
  });
});

describe('prayed-id memory', () => {
  it('remembers an id across reads', () => {
    window.localStorage.clear();
    rememberPrayedId(66296);
    expect(loadPrayedIds().has(66296)).toBe(true);
  });

  it('does not duplicate an id already remembered', () => {
    window.localStorage.clear();
    rememberPrayedId(66296);
    const ids = rememberPrayedId(66296);
    expect([...ids]).toEqual([66296]);
  });

  it('ignores junk left in storage instead of throwing', () => {
    window.localStorage.setItem('perimeter-prayer-wall:prayed', '{not json');
    expect(loadPrayedIds().size).toBe(0);
  });

  it('drops non-numeric entries someone else wrote under the key', () => {
    window.localStorage.setItem('perimeter-prayer-wall:prayed', JSON.stringify([1, 'two', null]));
    expect([...loadPrayedIds()]).toEqual([1]);
  });
});
