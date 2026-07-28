const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;
}

/**
 * Parse an MP naive-local date string (`YYYY-MM-DD[THH:mm:ss]`, no timezone)
 * into its calendar parts. Parsed component-wise rather than through
 * `new Date(iso)` so the wall-clock date MP stored survives regardless of the
 * viewer's timezone — the same reason the event-finder widget does it this way.
 */
function parseMpDate(iso: string): DateParts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

function formatDay(p: DateParts, withYear: boolean): string {
  const base = `${MONTHS_LONG[p.month - 1]} ${p.day}`;
  return withYear ? `${base}, ${p.year}` : base;
}

/**
 * A trip's travel window, e.g. `July 8 – July 17, 2026`. The year is printed
 * once when both ends share it, twice when the trip straddles New Year, and the
 * range collapses to a single date when the trip is one day (or has no end).
 * Returns null when there is no usable start date — MP leaves `Trip_Start_Date`
 * null on campaigns that have not been scheduled yet.
 */
export function formatTripDates(startIso: string | null, endIso: string | null): string | null {
  const start = startIso ? parseMpDate(startIso) : null;
  if (!start) return null;

  const end = endIso ? parseMpDate(endIso) : null;
  const sameDay =
    end && end.year === start.year && end.month === start.month && end.day === start.day;

  if (!end || sameDay) return formatDay(start, true);

  const sameYear = end.year === start.year;
  return `${formatDay(start, !sameYear)} – ${formatDay(end, true)}`;
}

/**
 * Whole-dollar USD, e.g. `$3,500`. Mission-trip goals are always round numbers
 * in MP, and the legacy widget's cents were noise on the card.
 */
export function formatCost(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Seats left on a capped trip, or null when the trip has no cap. */
export function spotsRemaining(
  registrantCount: number,
  maximumRegistrants: number | null,
): number | null {
  if (maximumRegistrants === null) return null;
  return Math.max(0, maximumRegistrants - registrantCount);
}
