import type { GivingHistoryItem } from '@perimeter/api-hooks';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCurrency(amount: number): string {
  return usd.format(amount);
}

export function formatCurrencyCompact(amount: number): string {
  return usdCompact.format(amount);
}

/**
 * The four-digit year of a gift. The API returns an ISO string already in
 * Eastern (e.g. `2026-02-15T00:00:00.000-05:00`); we read the date parts off
 * the string rather than constructing a `Date`, so the displayed day/year can
 * never shift by a timezone.
 */
export function getYear(iso: string): string {
  return iso.slice(0, 4);
}

/** A gift's date as `M/D/YYYY`, parsed from the ISO string's date parts. */
export function formatGiftDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  if (!year || !month || !day) return iso;
  return `${Number(month)}/${Number(day)}/${year}`;
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Build a CSV (Date, Donor, Given By, Program, Type, Amount) for the given
 * rows. "Given By" carries the soft-credit source — the fund, employer, or
 * trust the gift actually came from — and is blank for gifts the household
 * gave directly. Accounting reconciles against that column.
 */
export function buildCsv(items: GivingHistoryItem[]): string {
  const header = ['Date', 'Donor', 'Given By', 'Program', 'Type', 'Amount'];
  const rows = items.map((item) =>
    [
      formatGiftDate(item.date),
      item.donorName,
      item.softCreditSource ?? '',
      item.programName,
      item.paymentType,
      item.amount.toFixed(2),
    ]
      .map(csvCell)
      .join(','),
  );
  return [header.join(','), ...rows].join('\n');
}

/** Trigger a client-side download of `items` as a CSV file. */
export function downloadCsv(items: GivingHistoryItem[], filename = 'giving-history.csv'): void {
  const blob = new Blob([buildCsv(items)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
