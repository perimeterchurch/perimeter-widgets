import { describe, it, expect } from 'vitest';
import {
  formatLocation,
  formatMeetingSchedule,
  formatMeetingTime,
  formatStartDate,
  groupImageUrl,
  isUpcoming,
  truncate,
} from '../src/lib/format';

describe('formatStartDate', () => {
  it('formats an MP datetime as a short weekday date', () => {
    expect(formatStartDate('2026-08-16T17:00:00')).toBe('Sun, Aug 16, 2026');
  });

  it('formats a date-only value', () => {
    expect(formatStartDate('2014-02-09')).toBe('Sun, Feb 9, 2014');
  });

  it('gets the weekday right across a leap day and a century boundary', () => {
    expect(formatStartDate('2024-02-29T00:00:00')).toBe('Thu, Feb 29, 2024');
    expect(formatStartDate('2000-01-01T00:00:00')).toBe('Sat, Jan 1, 2000');
    expect(formatStartDate('2026-12-31T00:00:00')).toBe('Thu, Dec 31, 2026');
  });

  it('returns null for null and unparseable values', () => {
    expect(formatStartDate(null)).toBeNull();
    expect(formatStartDate('not a date')).toBeNull();
  });
});

describe('isUpcoming', () => {
  const today = new Date(2026, 6, 29); // 2026-07-29, local

  it('is true for a future date', () => {
    expect(isUpcoming('2026-08-16T17:00:00', today)).toBe(true);
  });

  it('is false for a past date', () => {
    expect(isUpcoming('2014-02-09T00:00:00', today)).toBe(false);
  });

  it('is false for today — a group starting today has started', () => {
    expect(isUpcoming('2026-07-29T09:00:00', today)).toBe(false);
  });

  it('is false for null', () => {
    expect(isUpcoming(null, today)).toBe(false);
  });

  it('ignores the time of day, so a late-evening start is not "tomorrow"', () => {
    expect(isUpcoming('2026-07-29T23:30:00', today)).toBe(false);
  });
});

describe('formatMeetingTime', () => {
  it.each([
    ['08:00:00', '8:00 AM'],
    ['12:00:00', '12:00 PM'],
    ['12:30:00', '12:30 PM'],
    ['17:00:00', '5:00 PM'],
    ['19:30:00', '7:30 PM'],
    ['00:30:00', '12:30 AM'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatMeetingTime(input)).toBe(expected);
  });

  it('returns null for null and unparseable values', () => {
    expect(formatMeetingTime(null)).toBeNull();
    expect(formatMeetingTime('evening')).toBeNull();
    expect(formatMeetingTime('99:00:00')).toBeNull();
  });
});

describe('formatMeetingSchedule', () => {
  it('pluralizes the day and joins it to the time', () => {
    expect(formatMeetingSchedule('Sunday', '17:00:00', 'Biweekly')).toBe('Sundays @ 5:00 PM');
  });

  it('does not pluralize "Varying Day"', () => {
    expect(formatMeetingSchedule('Varying Day', '19:00:00', null)).toBe('Varying Day @ 7:00 PM');
  });

  it('falls back to the day alone when there is no time', () => {
    expect(formatMeetingSchedule('Friday', null, 'Monthly')).toBe('Fridays');
  });

  it('falls back to the time alone when there is no day', () => {
    expect(formatMeetingSchedule(null, '19:00:00', 'Weekly')).toBe('7:00 PM');
  });

  it('falls back to the frequency when there is neither day nor time', () => {
    expect(formatMeetingSchedule(null, null, 'Monthly')).toBe('Monthly');
  });

  it('returns null when MP has none of the three', () => {
    expect(formatMeetingSchedule(null, null, null)).toBeNull();
  });
});

describe('formatLocation', () => {
  it('joins city and state', () => {
    expect(formatLocation('Alpharetta', 'GA')).toBe('Alpharetta, GA');
  });

  it('falls back to whichever half exists', () => {
    expect(formatLocation('Alpharetta', null)).toBe('Alpharetta');
    expect(formatLocation(null, 'GA')).toBe('GA');
  });

  it('returns null when both are missing', () => {
    expect(formatLocation(null, null)).toBeNull();
  });
});

describe('truncate', () => {
  it('leaves short text alone', () => {
    expect(truncate('Short enough', 40)).toBe('Short enough');
  });

  it('breaks on a word boundary and appends an ellipsis', () => {
    expect(truncate('one two three four five six', 12)).toBe('one two…');
  });

  it('strips trailing punctuation before the ellipsis', () => {
    expect(truncate('Come join us, everyone welcome', 14)).toBe('Come join us…');
  });

  it('hard-cuts a single very long token rather than collapsing the excerpt', () => {
    expect(truncate(`short ${'x'.repeat(100)}`, 20)).toBe('short xxxxxxxxxxxxxx…');
  });

  it('trims surrounding whitespace', () => {
    expect(truncate('  padded  ', 40)).toBe('padded');
  });
});

describe('groupImageUrl', () => {
  it('builds the image endpoint URL against an explicit base', () => {
    expect(groupImageUrl(14392, 'http://localhost:5500')).toBe(
      'http://localhost:5500/api/group-image/14392',
    );
  });
});
