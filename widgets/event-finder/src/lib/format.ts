const PRODUCTION_BASE_URL = 'https://api.perimeter.org';
const DEV_BASE_URL = '';

/**
 * Resolves the perimeter-api base URL. Priority:
 * 1. Explicit `baseUrl` argument (the `apiUrl` widget config)
 * 2. `VITE_API_URL` environment variable (studio dev → localhost:5500)
 * 3. `''` (same-origin) in dev, `api.perimeter.org` in production
 *
 * Mirrors the resolver in the sermons/latest-sermon widgets so image `<img>`
 * tags resolve against the API origin rather than the host page's origin.
 */
function resolveApiBaseUrl(baseUrl?: string): string {
  if (baseUrl) return baseUrl;

  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (import.meta.env.DEV) return DEV_BASE_URL;
  }

  return PRODUCTION_BASE_URL;
}

/**
 * Build an event's image URL. Served by the binary endpoint
 * `/api/event-image/{id}` (the MP default image for the Events record); the
 * endpoint 404s when the event has no image so the widget falls back.
 */
export function eventImageUrl(eventId: number, apiBaseUrl?: string): string {
  return `${resolveApiBaseUrl(apiBaseUrl)}/api/event-image/${eventId}`;
}

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
const MONTHS_SHORT = MONTHS_LONG.map((m) => m.slice(0, 3));
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
}

/**
 * Parse an MP naive-local datetime string (`YYYY-MM-DDTHH:mm:ss`, no timezone)
 * into its calendar parts. We parse the components directly rather than via
 * `new Date(iso)` so the wall-clock time MP stored is preserved regardless of
 * the viewer's timezone (matching the legacy widget, which rendered these as
 * local time).
 */
function parseMpDateTime(iso: string): DateParts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso);
  if (!m) return null;
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: m[4] ? Number(m[4]) : 0,
    minute: m[5] ? Number(m[5]) : 0,
  };
}

function weekdayShort(p: DateParts): string {
  // Local (not UTC) construction so the weekday matches the wall-clock date.
  const d = new Date(p.year, p.month - 1, p.day);
  return WEEKDAYS_SHORT[d.getDay()] ?? '';
}

function formatTime(p: DateParts): string {
  const period = p.hour < 12 ? 'AM' : 'PM';
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  const mm = p.minute.toString().padStart(2, '0');
  return `${h12}:${mm} ${period}`;
}

/**
 * Default event date/time display, e.g.
 * `Sat, Sep 13, 2025 · 6:00 – 9:00 PM` (single day) or
 * `Sep 13 – Sep 15, 2025` (multi-day).
 */
export function formatEventDate(startIso: string, endIso: string): string {
  const start = parseMpDateTime(startIso);
  if (!start) return startIso;
  const end = parseMpDateTime(endIso);

  const sameDay =
    end && end.year === start.year && end.month === start.month && end.day === start.day;

  const startDay = `${MONTHS_SHORT[start.month - 1]} ${start.day}`;

  if (end && !sameDay) {
    const endDay = `${MONTHS_SHORT[end.month - 1]} ${end.day}`;
    const endYear = end.year === start.year ? '' : `, ${end.year}`;
    return `${startDay}${end.year === start.year ? '' : `, ${start.year}`} – ${endDay}${endYear || `, ${end.year}`}`;
  }

  const base = `${weekdayShort(start)}, ${startDay}, ${start.year} · ${formatTime(start)}`;
  if (end && (end.hour !== start.hour || end.minute !== start.minute)) {
    return `${base} – ${formatTime(end)}`;
  }
  return base;
}

/**
 * Compact alternate date format matching the legacy widget's `alt-date`:
 * `Fri | September 13 | 6:00 PM`.
 */
export function formatEventDateAlt(startIso: string): string {
  const start = parseMpDateTime(startIso);
  if (!start) return startIso;
  return `${weekdayShort(start)} | ${MONTHS_LONG[start.month - 1]} ${start.day} | ${formatTime(start)}`;
}

/**
 * Convert an MP HTML description to plain text with whitespace collapsed. Event
 * descriptions are staff-authored HTML, but the card shows a short truncated
 * opening (see {@link truncate}), so tags and links are dropped rather than
 * rendered. Uses `DOMParser` — which neither runs scripts nor loads resources —
 * with a crude tag-strip fallback for any non-DOM environment.
 */
export function htmlToText(html: string): string {
  const raw =
    typeof DOMParser !== 'undefined'
      ? (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '')
      : html.replace(/<[^>]*>/g, ' ');
  return raw.replace(/\s+/g, ' ').trim();
}

/**
 * Trim to `limit` characters on a word boundary, appending an ellipsis. Mirrors
 * the community-group-finder `truncate` so both finders clip descriptions the
 * same way: prefer a word break, but fall back to a hard cut when the text
 * opens with one very long unbroken token.
 */
export function truncate(text: string, limit: number): string {
  const collapsed = text.trim();
  if (collapsed.length <= limit) return collapsed;

  const cut = collapsed.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  const body = lastSpace > limit * 0.3 ? cut.slice(0, lastSpace) : cut;
  return `${body.replace(/[\s,.;:!-]+$/, '')}…`;
}
