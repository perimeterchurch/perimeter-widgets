import { describe, it, expect } from 'vitest';
import { eventImageUrl, formatEventDate, formatEventDateAlt } from '../src/lib/format';

describe('formatEventDate', () => {
  it('formats a single-day event as weekday, date, and time range', () => {
    expect(formatEventDate('2030-09-13T18:00:00', '2030-09-13T21:00:00')).toBe(
      'Fri, Sep 13, 2030 · 6:00 PM – 9:00 PM',
    );
  });

  it('omits the end time when start and end are the same time', () => {
    expect(formatEventDate('2030-09-13T18:00:00', '2030-09-13T18:00:00')).toBe(
      'Fri, Sep 13, 2030 · 6:00 PM',
    );
  });

  it('formats a multi-day event as a date range', () => {
    expect(formatEventDate('2030-09-13T18:00:00', '2030-09-15T12:00:00')).toBe(
      'Sep 13 – Sep 15, 2030',
    );
  });

  it('handles midnight and noon time boundaries', () => {
    expect(formatEventDate('2030-01-01T00:00:00', '2030-01-01T12:00:00')).toBe(
      'Tue, Jan 1, 2030 · 12:00 AM – 12:00 PM',
    );
  });

  it('returns the raw string for an unparseable date', () => {
    expect(formatEventDate('not-a-date', 'nope')).toBe('not-a-date');
  });
});

describe('formatEventDateAlt', () => {
  it('formats the compact "weekday | month day | time" shape', () => {
    expect(formatEventDateAlt('2030-09-13T18:30:00')).toBe('Fri | September 13 | 6:30 PM');
  });
});

describe('eventImageUrl', () => {
  it('builds the image endpoint URL against the given base', () => {
    expect(eventImageUrl(52041, 'https://api.perimeter.org')).toBe(
      'https://api.perimeter.org/api/event-image/52041',
    );
  });
});
