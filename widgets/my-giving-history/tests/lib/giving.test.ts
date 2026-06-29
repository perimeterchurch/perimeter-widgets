import { describe, it, expect } from 'vitest';
import type { GivingHistoryItem } from '@perimeter/api-hooks';
import {
  EMPTY_FILTERS,
  filterItems,
  filterOptions,
  hasActiveFilter,
  totalAmount,
  totalsByYear,
} from '../../src/lib/giving';

const items: GivingHistoryItem[] = [
  {
    distributionId: 1,
    donationId: 1,
    date: '2025-12-01T00:00:00.000-05:00',
    amount: 70,
    donorName: 'Sam Giver',
    paymentType: 'Credit Card',
    programName: 'Missions',
  },
  {
    distributionId: 2,
    donationId: 2,
    date: '2026-02-15T00:00:00.000-05:00',
    amount: 25,
    donorName: 'Pat Giver',
    paymentType: 'Cash',
    programName: 'Tithes',
  },
  {
    distributionId: 3,
    donationId: 3,
    date: '2026-03-20T00:00:00.000-04:00',
    amount: 100,
    donorName: 'Sam Giver',
    paymentType: 'Cash',
    programName: 'Tithes',
  },
];

describe('giving filters + aggregation', () => {
  it('hasActiveFilter is false only for the empty state', () => {
    expect(hasActiveFilter(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilter({ ...EMPTY_FILTERS, donor: 'Sam Giver' })).toBe(true);
  });

  it('filters by a single field and by multiple fields combined', () => {
    expect(filterItems(items, { ...EMPTY_FILTERS, year: '2026' })).toHaveLength(2);
    expect(filterItems(items, { ...EMPTY_FILTERS, donor: 'Sam Giver' })).toHaveLength(2);
    const both = filterItems(items, { ...EMPTY_FILTERS, year: '2026', donor: 'Sam Giver' });
    expect(both.map((i) => i.distributionId)).toEqual([3]);
  });

  it('derives distinct option lists (years newest-first, rest alphabetical)', () => {
    const options = filterOptions(items);
    expect(options.years).toEqual(['2026', '2025']);
    expect(options.donors).toEqual(['Pat Giver', 'Sam Giver']);
    expect(options.paymentTypes).toEqual(['Cash', 'Credit Card']);
    expect(options.programs).toEqual(['Missions', 'Tithes']);
  });

  it('sums amounts and totals by year ascending', () => {
    expect(totalAmount(items)).toBe(195);
    expect(totalsByYear(items)).toEqual([
      { year: '2025', total: 70 },
      { year: '2026', total: 125 },
    ]);
  });
});
