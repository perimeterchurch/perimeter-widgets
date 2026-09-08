import { describe, it, expect } from 'vitest';
import {
  dialDigits,
  formatAddressLine,
  formatCurrency,
  formatDate,
  formatDateRange,
  parseTripDate,
  progressLevel,
  progressPercent,
} from '../../src/lib/format';

describe('parseTripDate', () => {
  it('reads a date-only string as a local calendar date, not UTC midnight', () => {
    // The bug this guards: `new Date('2026-06-12')` is UTC midnight, which is
    // 6/11 in every US timezone. MP stores a wall-clock date.
    const date = parseTripDate('2026-06-12');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(5);
    expect(date.getDate()).toBe(12);
  });

  it('reads a timezone-less datetime as local too', () => {
    const date = parseTripDate('2026-06-12T00:00');
    expect(date.getDate()).toBe(12);
  });

  it('defers to Date for a string carrying an offset', () => {
    expect(parseTripDate('2026-06-12T12:00:00Z').toISOString()).toBe('2026-06-12T12:00:00.000Z');
  });
});

describe('formatCurrency', () => {
  it('groups thousands and keeps two decimals', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
    expect(formatCurrency(1_234_567.89)).toBe('$1,234,567.89');
  });

  it('puts the sign ahead of the symbol for a reversal', () => {
    expect(formatCurrency(-5)).toBe('-$5.00');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('formatDate', () => {
  it('renders m/d/yyyy', () => {
    expect(formatDate('2026-06-12')).toBe('6/12/2026');
  });

  it('renders a range', () => {
    expect(formatDateRange('2026-06-12', '2026-06-26')).toBe('6/12/2026 to 6/26/2026');
  });
});

describe('progressPercent', () => {
  it('is the raised share of the goal', () => {
    expect(progressPercent(1500, 4000)).toBe(37.5);
  });

  it('clamps an over-funded pledge to 100 rather than overflowing the track', () => {
    expect(progressPercent(5000, 4000)).toBe(100);
  });

  it('clamps a negative balance to 0', () => {
    expect(progressPercent(-100, 4000)).toBe(0);
  });

  it('is 0 for a goal of 0 rather than dividing by zero', () => {
    expect(progressPercent(500, 0)).toBe(0);
  });
});

describe('progressLevel', () => {
  it('steps low / medium / high at 50 and 75', () => {
    expect(progressLevel(0)).toBe('low');
    expect(progressLevel(49.9)).toBe('low');
    expect(progressLevel(50)).toBe('medium');
    expect(progressLevel(74.9)).toBe('medium');
    expect(progressLevel(75)).toBe('high');
    expect(progressLevel(100)).toBe('high');
  });
});

describe('dialDigits', () => {
  it('strips punctuation but keeps a leading +', () => {
    expect(dialDigits('770-555-0143')).toBe('7705550143');
    expect(dialDigits('+1 (770) 555-0143')).toBe('+17705550143');
  });
});

describe('formatAddressLine', () => {
  it('joins city, state and postal code', () => {
    expect(formatAddressLine({ city: 'Duluth', state: 'GA', postalCode: '30097' })).toBe(
      'Duluth, GA 30097',
    );
  });

  it('omits missing parts without leaving stray separators', () => {
    expect(formatAddressLine({ city: 'Duluth', state: null, postalCode: null })).toBe('Duluth');
    expect(formatAddressLine({ city: null, state: null, postalCode: '30097' })).toBe('30097');
    expect(formatAddressLine({ city: null, state: null, postalCode: null })).toBe('');
  });
});
