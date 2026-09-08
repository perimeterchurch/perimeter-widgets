/**
 * A trip/donation date as it should be read by a human.
 *
 * MP stores these as wall-clock calendar dates (the legacy stored procedure
 * even `CONVERT(DATE, …)`s the past-trip columns), so the date in the string is
 * the date to show. `new Date('2026-03-11')` would parse that as UTC midnight
 * and render as 3/10 anywhere west of Greenwich — the classic off-by-one — so a
 * date-only or timezone-less string is built as a LOCAL calendar date instead.
 * A string carrying a real offset is left to `Date` to resolve as an instant.
 */
export function parseTripDate(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(value);
  if (dateOnly) {
    const [, y, m, d, hh, mm] = dateOnly;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh ?? 0), Number(mm ?? 0));
  }
  return new Date(value);
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `$1,234.56`, and `-$5.00` for a reversal. */
export function formatCurrency(amount: number): string {
  return currency.format(amount);
}

const shortDate = new Intl.DateTimeFormat('en-US', {
  month: 'numeric',
  day: 'numeric',
  year: 'numeric',
});

/** `3/11/2026` — matches the legacy widget's date rendering. */
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? parseTripDate(value) : value;
  return shortDate.format(date);
}

/**
 * `3/11/2026 to 3/20/2026`, or a partial range when MP has only one date.
 *
 * Both trip dates are nullable in MP — a campaign can exist before its travel
 * dates are set — so a trip with neither says so rather than rendering
 * "Invalid Date to Invalid Date".
 */
export function formatDateRange(start: string | null, end: string | null): string {
  if (start && end) return `${formatDate(start)} to ${formatDate(end)}`;
  if (start) return `From ${formatDate(start)}`;
  if (end) return `Through ${formatDate(end)}`;
  return 'Dates to be announced';
}

/**
 * Share of a goal that has been raised, as a percentage clamped to 0–100.
 *
 * The legacy widget clamped only the floor (`Math.max(…, 0)`), so an
 * over-funded pledge rendered a bar wider than its track. A goal of 0 is 0%
 * rather than a division by zero.
 */
export function progressPercent(raised: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(Math.max((raised / goal) * 100, 0), 100);
}

export type ProgressLevel = 'low' | 'medium' | 'high';

/** Funding tiers behind the progress-bar colour: <50%, 50–75%, >=75%. */
export function progressLevel(percent: number): ProgressLevel {
  if (percent < 50) return 'low';
  if (percent < 75) return 'medium';
  return 'high';
}

/** `tel:`/`sms:` href — keep digits and a leading `+`, drop spaces and dashes. */
export function dialDigits(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

/** A donation's mailing address on one line, or `''` when there is nothing to show. */
export function formatAddressLine(address: {
  city: string | null;
  state: string | null;
  postalCode: string | null;
}): string {
  const cityState = [address.city, address.state].filter(Boolean).join(', ');
  return [cityState, address.postalCode].filter(Boolean).join(' ');
}

const PRODUCTION_BASE_URL = 'https://api.perimeter.org';
const DEV_BASE_URL = '';

/**
 * Resolves the perimeter-api base URL. Priority:
 * 1. Explicit `baseUrl` argument (the `apiUrl` widget config)
 * 2. `VITE_API_URL` environment variable (studio dev → localhost:5500)
 * 3. `''` (same-origin) in dev, `api.perimeter.org` in production
 *
 * Mirrors the resolver in the mission-trip-finder/community-group-finder
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
 * A trip leader's photo URL, served by the public mission-trip-finder's
 * participant-photo route.
 *
 * The API hands back the leader's `pledgeId` rather than a URL: the legacy
 * widget got a direct Ministry Platform `getfile` link with the domain GUID
 * embedded in it, and `dp_Files` is not reachable over MP's REST API at all.
 * The endpoint 404s both for a leader with no photo on file (the common case)
 * and for a pledge not on the trip, so a failed load means "use the fallback",
 * never "something is broken".
 */
export function leaderPhotoUrl(campaignId: number, pledgeId: number, apiBaseUrl?: string): string {
  return `${resolveApiBaseUrl(apiBaseUrl)}/api/mission-trips/${campaignId}/participant/${pledgeId}/image`;
}
