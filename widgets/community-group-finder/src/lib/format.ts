const PRODUCTION_BASE_URL = 'https://api.perimeter.org';
const DEV_BASE_URL = '';

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Resolves the perimeter-api base URL. Priority:
 * 1. Explicit `baseUrl` argument (the `apiUrl` widget config)
 * 2. `VITE_API_URL` environment variable (studio dev → localhost:5500)
 * 3. `''` (same-origin) in dev, `api.perimeter.org` in production
 *
 * Mirrors the resolver in the event-finder/sermons widgets so image `<img>` tags
 * resolve against the API origin rather than the host page's origin.
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
 * Build a group's banner URL. Served by the binary endpoint
 * `/api/group-image/{id}` (the MP default image for the Groups record, which is
 * the group's neighborhood banner); the endpoint 404s when the group has no
 * image so the widget falls back.
 */
export function groupImageUrl(groupId: number, apiBaseUrl?: string): string {
  return `${resolveApiBaseUrl(apiBaseUrl)}/api/group-image/${groupId}`;
}

interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;
}

/**
 * Parse an MP naive-local date string (`YYYY-MM-DD[THH:mm:ss]`, no timezone)
 * into its calendar parts. Parsed component-wise rather than through
 * `new Date(iso)` so the wall-clock date MP stored survives regardless of the
 * viewer's timezone — the same reason the event-finder and mission-trip-finder
 * widgets do it this way.
 */
function parseMpDate(iso: string): DateParts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/** Day-of-week index (0 = Sunday) for a calendar date, via Zeller's congruence. */
function weekdayIndex({ year, month, day }: DateParts): number {
  // Treat January and February as months 13 and 14 of the previous year.
  const m = month < 3 ? month + 12 : month;
  const y = month < 3 ? year - 1 : year;
  const k = y % 100;
  const j = Math.floor(y / 100);
  const h =
    (day + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) + 5 * j) % 7;
  // Zeller yields 0 = Saturday; shift so 0 = Sunday.
  return (h + 6) % 7;
}

/**
 * A group's start date as `Sun, Aug 16, 2026`, or null when there is no usable
 * date. Computed from the calendar parts rather than `Date`'s locale formatting
 * so a viewer west of Eastern time never sees the day shifted back one.
 */
export function formatStartDate(startIso: string | null): string | null {
  const parts = startIso ? parseMpDate(startIso) : null;
  if (!parts) return null;

  const weekday = WEEKDAYS_SHORT[weekdayIndex(parts)];
  const month = MONTHS_SHORT[parts.month - 1];
  return `${weekday}, ${month} ${parts.day}, ${parts.year}`;
}

/**
 * True when the date is strictly after today. Long-running groups carry a
 * `Start_Date` from years ago (many are 2014), and "Starts: Sun, Feb 9, 2014"
 * on a card reads as stale data rather than information — so the card shows the
 * start date only for groups that have not begun yet, which is the case the
 * reader can act on.
 */
export function isUpcoming(startIso: string | null, today: Date = new Date()): boolean {
  const parts = startIso ? parseMpDate(startIso) : null;
  if (!parts) return false;

  // Compared as a sortable YYYYMMDD number so no timezone conversion happens on
  // either side.
  const start = parts.year * 10000 + parts.month * 100 + parts.day;
  const now = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return start > now;
}

/** `Alpharetta, GA` — either half may be missing; returns null when both are. */
export function formatLocation(city: string | null, state: string | null): string | null {
  if (city && state) return `${city}, ${state}`;
  return city ?? state ?? null;
}

/** `5:00 PM` from an `HH:mm:ss` time, or null when unparseable. */
export function formatMeetingTime(meetingTime: string | null): string | null {
  if (meetingTime === null) return null;
  const m = /^(\d{2}):(\d{2})/.exec(meetingTime);
  if (!m) return null;

  const hours = Number(m[1]);
  const minutes = m[2];
  if (hours > 23) return null;

  const period = hours < 12 ? 'AM' : 'PM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${period}`;
}

/**
 * `Sundays` from `Sunday`. MP's `Meeting_Days` list is the seven weekdays plus
 * the literal "Varying Day", which must not become "Varying Days".
 */
function pluralizeDay(meetingDay: string): string {
  return WEEKDAYS_SHORT.some((short) => meetingDay.startsWith(short))
    ? `${meetingDay}s`
    : meetingDay;
}

/**
 * The card's schedule line: `Sundays at 5:00 PM`.
 *
 * Falls back through what MP actually has, since most groups are missing at
 * least one piece — day plus time when both exist, then day alone, then time
 * alone, then the meeting frequency ("Monthly") so a group with no day or time
 * still says something. Null only when MP has none of the three.
 */
export function formatMeetingSchedule(
  meetingDay: string | null,
  meetingTime: string | null,
  meetingFrequency: string | null,
): string | null {
  const day = meetingDay === null ? null : pluralizeDay(meetingDay);
  const time = formatMeetingTime(meetingTime);

  if (day && time) return `${day} at ${time}`;
  if (day) return day;
  if (time) return time;
  return meetingFrequency;
}

/**
 * Trim to `limit` characters on a word boundary, appending an ellipsis. MP
 * descriptions are staff-authored free text and run to several paragraphs; the
 * card shows an opening rather than the whole thing.
 */
export function truncate(text: string, limit: number): string {
  const collapsed = text.trim();
  if (collapsed.length <= limit) return collapsed;

  const cut = collapsed.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  // Prefer the word boundary — a mid-word cut ("…and we go hik…") reads worse
  // than a slightly shorter excerpt. The threshold only rejects a break so
  // early that the excerpt would say almost nothing, which happens when the
  // text opens with one very long unbroken token; then a hard cut is better.
  const body = lastSpace > limit * 0.3 ? cut.slice(0, lastSpace) : cut;
  return `${body.replace(/[\s,.;:!-]+$/, '')}…`;
}
