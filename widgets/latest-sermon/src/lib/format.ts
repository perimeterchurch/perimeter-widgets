const PRODUCTION_BASE_URL = 'https://api.perimeter.org';
const DEV_BASE_URL = '';

/**
 * Resolves the perimeter-api base URL. Priority:
 * 1. Explicit `baseUrl` argument (the `apiUrl` widget config)
 * 2. `VITE_API_URL` environment variable (studio dev → localhost:5500)
 * 3. `''` (same-origin) in dev, `api.perimeter.org` in production
 *
 * Mirrors the resolver in the sermons widget so image `<img>` tags resolve
 * against the API origin rather than the host page's origin.
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
 * Build the sermon banner image URL. The list/detail endpoints return a null
 * `bannerUrl` for most sermons, so the image is served by the binary endpoint
 * `/api/sermons/sermon/{id}/image` (the MP default image for the record).
 */
export function sermonImageUrl(sermonId: number, apiBaseUrl?: string): string {
  return `${resolveApiBaseUrl(apiBaseUrl)}/api/sermons/sermon/${sermonId}/image`;
}

/**
 * Build the series artwork URL. This is the promotional series graphic (e.g.
 * the "Work in Progress" collage), served by `/api/sermons/series/{id}/image`.
 * Preferred over the per-sermon image, which is often just a photo of the
 * speaker on stage.
 */
export function seriesImageUrl(seriesId: number, apiBaseUrl?: string): string {
  return `${resolveApiBaseUrl(apiBaseUrl)}/api/sermons/series/${seriesId}/image`;
}

/**
 * Build the link to the public sermon-details page (which embeds its own
 * player), keyed by sermon ID — e.g.
 * `https://www.perimeter.org/sermons/sermon-details/?id=5592`. The base is
 * configurable so the widget can point at staging or a future path.
 */
export function sermonDetailsUrl(sermonId: number, baseUrl: string): string {
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}id=${sermonId}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format an MP `YYYY-MM-DD` date string as e.g. `Jun 14, 2026`. Parses the
 * parts directly rather than via `new Date(iso)` to avoid the UTC-midnight
 * off-by-one-day shift in negative-offset timezones.
 */
export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  const monthName = MONTHS[Number(month) - 1] ?? month;
  return `${monthName} ${Number(day)}, ${year}`;
}
