/** Impersonation is restricted to this MP security role (role 2). */
export const ADMIN_ROLE_NAME = 'Administrators';

/** httpOnly cookie holding the signed impersonation target (a User_ID). */
export const IMPERSONATE_COOKIE = 'studio.impersonate';

/**
 * The ONLY perimeter-api paths the impersonation proxy may forward — the
 * read-only endpoints the gated widgets need. Least privilege: impersonation
 * can never drive a write or reach an unrelated endpoint.
 */
export const ALLOWED_PROXY_PATHS: readonly string[] = ['giving/history', 'shepherds'];

export function isAllowedProxyPath(path: string): boolean {
  return ALLOWED_PROXY_PATHS.includes(path);
}

/** perimeter-api base URL — local dev default, prod is api.perimeter.org. */
export function perimeterApiUrl(): string {
  return process.env.PERIMETER_API_URL || 'http://localhost:5500';
}
