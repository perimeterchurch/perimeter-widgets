import { describe, it, expect } from 'vitest';
import {
  buildCsv,
  donorLabel,
  formatCurrency,
  formatGiftDate,
  getYear,
} from '../../src/lib/format';
import type { GivingHistoryItem } from '@perimeter/api-hooks';

function item(overrides: Partial<GivingHistoryItem> = {}): GivingHistoryItem {
  return {
    distributionId: 1,
    donationId: 1,
    date: '2026-02-15T00:00:00.000-05:00',
    amount: 70,
    donorName: 'Sam Giver',
    softCreditSource: null,
    paymentType: 'Cash',
    programName: 'Tithes & Offerings (Fund)',
    ...overrides,
  };
}

describe('format helpers', () => {
  it('reads the year off the ISO string without timezone drift', () => {
    expect(getYear('2026-02-15T00:00:00.000-05:00')).toBe('2026');
    // Midnight Eastern must not roll back to the prior year via UTC.
    expect(getYear('2026-01-01T00:00:00.000-05:00')).toBe('2026');
  });

  it('formats the gift date as M/D/YYYY from the date parts', () => {
    expect(formatGiftDate('2026-02-05T00:00:00.000-05:00')).toBe('2/5/2026');
  });

  it('formats currency as USD', () => {
    expect(formatCurrency(70)).toBe('$70.00');
    expect(formatCurrency(-12.5)).toBe('-$12.50');
  });

  it('lists a soft-credited gift under the foundation, crediting the member', () => {
    expect(donorLabel(item({ softCreditSource: 'Fidelity Charitable Gift Fund Foundation' }))).toBe(
      'Fidelity Charitable Gift Fund Foundation',
    );
  });

  it('lists a directly-given gift under the member', () => {
    expect(donorLabel(item({ softCreditSource: null }))).toBe('Sam Giver');
  });

  it('builds CSV with a header and quotes cells containing commas', () => {
    const csv = buildCsv([
      item({ donorName: 'Giver, Sam', programName: 'General', amount: 1234.5 }),
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Date,Donor,Credited To,Program,Type,Amount');
    // Directly given: Donor and Credited To are the same member.
    expect(lines[1]).toBe('2/15/2026,"Giver, Sam","Giver, Sam",General,Cash,1234.50');
  });

  it('puts the foundation in Donor and the member in Credited To', () => {
    const csv = buildCsv([
      item({
        softCreditSource: 'Fidelity Charitable Gift Fund Foundation',
        programName: 'Forward Campaign',
        amount: 800,
      }),
    ]);
    expect(csv.split('\n')[1]).toBe(
      '2/15/2026,Fidelity Charitable Gift Fund Foundation,Sam Giver,Forward Campaign,Cash,800.00',
    );
  });
});
