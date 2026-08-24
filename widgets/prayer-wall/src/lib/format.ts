/**
 * "Monday, August 17, 2026" — the card's date line, formatted the way the wall
 * has always shown it.
 *
 * Pinned to America/New_York rather than the reader's zone: a request submitted
 * at 00:33 Eastern would otherwise read as the previous day for a visitor on the
 * west coast, and the church's calendar is the one that matters here.
 */
const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/New_York',
});

export function formatSubmittedDate(iso: string): string {
  const parsed = new Date(iso);
  // An unparseable timestamp shows nothing rather than "Invalid Date".
  if (Number.isNaN(parsed.getTime())) return '';
  return DATE_FORMAT.format(parsed);
}

/** "Prayed for 1 Time" / "Prayed for 19 Times" — the post-prayer label. */
export function formatPrayerCount(count: number): string {
  return `Prayed for ${count} ${count === 1 ? 'Time' : 'Times'}`;
}

/**
 * The window of page numbers to show, five wide, centered on the current page
 * where it can be — the same five-button window the wall has always had, so a
 * feed 40 pages deep doesn't render 40 buttons.
 */
export function pageWindow(page: number, totalPages: number, width = 5): number[] {
  const span = Math.min(width, totalPages);
  const start = Math.min(
    Math.max(1, page - Math.floor(span / 2)),
    Math.max(1, totalPages - span + 1),
  );
  return Array.from({ length: span }, (_, i) => start + i);
}
