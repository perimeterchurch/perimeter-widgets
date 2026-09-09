import type { MyMissionDonation } from '@perimeter/api-hooks';
import { formatCurrency, formatDate, formatAddressLine } from './format';

const HEADERS = ['Date', 'Amount', 'Name', 'Email', 'Phone', 'Address'] as const;

/**
 * Quote one CSV cell.
 *
 * Doubles embedded quotes — the legacy widget wrapped every cell in `"` without
 * escaping, so a single donor name containing a quote broke the row and shifted
 * every column after it. A leading `=`, `+`, `-` or `@` is prefixed with a
 * `'` so a spreadsheet treats the cell as text rather than evaluating it as a
 * formula on open (CSV injection).
 */
function quote(value: string): string {
  const escaped = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${escaped.replace(/"/g, '""')}"`;
}

/** The donation table as CSV text, header row first, in the order given. */
export function donationsToCsv(donations: readonly MyMissionDonation[]): string {
  const rows = donations.map((donation) => [
    formatDate(donation.date),
    formatCurrency(donation.amount),
    donation.donorName,
    donation.email ?? '',
    donation.phone ?? '',
    donation.anonymous || donation.address === null
      ? ''
      : [donation.address.line1, formatAddressLine(donation.address)].filter(Boolean).join(', '),
  ]);

  return [HEADERS.join(','), ...rows.map((row) => row.map(quote).join(','))].join('\n');
}

/**
 * Hand the browser a CSV file to save.
 *
 * The anchor is appended to the host `document`, not the shadow root: a click
 * on a detached (or shadow-contained) element does not reliably start a
 * download. The object URL is revoked once the click has been dispatched — the
 * legacy widget leaked one blob per download for the life of the page.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** `donations-2026-09-08.csv` */
export function donationsFilename(now: Date = new Date()): string {
  const [date] = now.toISOString().split('T');
  return `donations-${date}.csv`;
}
