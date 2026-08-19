const PRODUCTION_BASE_URL = 'https://api.perimeter.org';
const DEV_BASE_URL = '';

/**
 * Resolves the perimeter-api base URL. Priority:
 * 1. Explicit `baseUrl` argument (the `apiUrl` widget config)
 * 2. `VITE_API_URL` environment variable (studio dev → localhost:5500)
 * 3. `''` (same-origin) in dev, `api.perimeter.org` in production
 *
 * Mirrors the resolver in the community-group-finder/event-finder widgets so the
 * photo `<img>` resolves against the API origin, not the host page's origin.
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
 * Build a staff member's photo URL. Served by the binary endpoint
 * `/api/staff-contact/{guid}/photo`, which 404s when the member has no photo so
 * the widget falls back to a placeholder avatar.
 */
export function staffPhotoUrl(contactGuid: string, apiBaseUrl?: string): string {
  return `${resolveApiBaseUrl(apiBaseUrl)}/api/staff-contact/${encodeURIComponent(contactGuid)}/photo`;
}
