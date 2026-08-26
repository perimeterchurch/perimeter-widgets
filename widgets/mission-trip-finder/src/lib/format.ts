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
 * The hero's spelled-out travel window, e.g.
 * `July 25, 2026 – July 30, 2026`. Unlike {@link formatTripDates} the year is
 * printed on both ends even when they match: this is the legacy detail page's
 * format (its proc formatted each date `MMMM dd, yyyy` independently), and at
 * hero size the repetition reads as deliberate rather than redundant. Cards
 * keep the compact form.
 */
export function formatTripDatesLong(startIso: string | null, endIso: string | null): string | null {
  const start = startIso ? parseMpDate(startIso) : null;
  if (!start) return null;

  const end = endIso ? parseMpDate(endIso) : null;
  const sameDay =
    end && end.year === start.year && end.month === start.month && end.day === start.day;

  if (!end || sameDay) return formatDay(start, true);
  return `${formatDay(start, true)} \u2013 ${formatDay(end, true)}`;
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

const PRODUCTION_BASE_URL = 'https://api.perimeter.org';
const DEV_BASE_URL = '';

/**
 * Resolves the perimeter-api base URL. Priority:
 * 1. Explicit `baseUrl` argument (the `apiUrl` widget config)
 * 2. `VITE_API_URL` environment variable (studio dev → localhost:5500)
 * 3. `''` (same-origin) in dev, `api.perimeter.org` in production
 *
 * Mirrors the resolver in the community-group-finder/event-finder/sermons
 * widgets so image `<img>` tags resolve against the API origin rather than the
 * host page's origin.
 */
function resolveApiBaseUrl(baseUrl?: string): string {
  // A trailing slash is trimmed so `data-api-url="https://api.perimeter.org/"`
  // does not produce a doubled slash in the path.
  if (baseUrl) return baseUrl.replace(/\/$/, '');

  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (import.meta.env.DEV) return DEV_BASE_URL;
  }

  return PRODUCTION_BASE_URL;
}

/**
 * A team member's profile photo URL. The endpoint 404s both for a participant
 * with no photo on file (the common case) and for a pledge that is not on the
 * trip, so callers must treat a failed load as "use the default avatar".
 */
export function participantPhotoUrl(tripId: number, pledgeId: number, apiBaseUrl?: string): string {
  return `${resolveApiBaseUrl(apiBaseUrl)}/api/mission-trips/${tripId}/participant/${pledgeId}/image`;
}

/**
 * Fill a configured URL template. `{id}` is the trip, `{pledgeId}` the
 * participant. Templates rather than base URLs because the legacy giving form
 * needs its `#!/` fragment after the campaign ID, which appending cannot do.
 */
export function fillUrlTemplate(
  template: string,
  values: { id: number; pledgeId?: number },
): string {
  return template
    .replace(/\{id\}/g, String(values.id))
    .replace(/\{pledgeId\}/g, values.pledgeId === undefined ? '' : String(values.pledgeId));
}
