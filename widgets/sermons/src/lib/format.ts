const S3_ORIGIN = 'https://perimeter-files.s3.amazonaws.com';

const PRODUCTION_BASE_URL = 'https://api.perimeter.org';
const DEV_BASE_URL = '';

/**
 * Resolves the API base URL. Priority:
 * 1. Explicit `baseUrl` argument (e.g., from the `apiUrl` widget config)
 * 2. `VITE_API_URL` environment variable
 * 3. `''` (same-origin) in development, `api.perimeter.org` in production
 */
function resolveApiBaseUrl(baseUrl?: string): string {
  if (baseUrl) return baseUrl;

  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (import.meta.env.DEV) return DEV_BASE_URL;
  }

  return PRODUCTION_BASE_URL;
}

export function proxyS3Url(url: string): string {
  if (import.meta.env.DEV && url.startsWith(S3_ORIGIN)) {
    return url.replace(S3_ORIGIN, '/s3-proxy');
  }
  return url;
}

/**
 * Build a sermon image URL. Pass `apiBaseUrl` (from widget config) so the
 * `<img>` tag resolves against the API origin rather than the host page's
 * origin — otherwise an embed on example.com would request
 * example.com/api/sermons/... and 404. When `apiBaseUrl` is omitted the
 * shared resolver falls back to localhost in dev / api.perimeter.org in
 * production.
 */
export function sermonImageUrl(sermonId: number, apiBaseUrl?: string): string {
  return `${resolveApiBaseUrl(apiBaseUrl)}/api/sermons/sermon/${sermonId}/image`;
}

export function seriesImageUrl(seriesId: number, apiBaseUrl?: string): string {
  return `${resolveApiBaseUrl(apiBaseUrl)}/api/sermons/series/${seriesId}/image`;
}

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
