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

/**
 * The donor a row is listed under: the giving organization for a soft-credited
 * gift (a foundation, donor-advised fund, or employer), otherwise the household
 * member. This is what donors scan for — they know these as "Foundation checks"
 * and look for the foundation's name, which is how the legacy MyGivingHistory
 * widget listed them.
 *
 * The table's Donor column, the Donor filter's options, and the CSV all read
 * from here, so the three can never disagree about what a row is filed under.
 */
export function donorLabel(item: GivingHistoryItem): string {
  return item.softCreditSource ?? item.donorName;
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
 * Build a CSV (Date, Donor, Credited To, Program, Type, Amount) for the given
 * rows, matching the table: **Donor** is who the gift came from (a foundation
 * or donor-advised fund on a soft-credited gift, otherwise the member) and
 * **Credited To** is the household member it counts for. Both are always
 * populated — on a directly-given gift they are the same name — so accounting
 * can pivot on either without reading blanks as missing data.
 */
export function buildCsv(items: GivingHistoryItem[]): string {
  const header = ['Date', 'Donor', 'Credited To', 'Program', 'Type', 'Amount'];
  const rows = items.map((item) =>
    [
      formatGiftDate(item.date),
      donorLabel(item),
      item.donorName,
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
