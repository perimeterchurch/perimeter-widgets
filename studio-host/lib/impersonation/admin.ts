import { ADMIN_ROLE_NAME } from './config';

/**
 * Impersonation is restricted to MP Administrators (role 2) — narrower than
 * general studio access (Administrators OR Website Folder - Edit). The session
 * stores the matched allowed role NAMES as a CSV (`better-auth.ts` `roles`
 * field); this checks whether "Administrators" is among them.
 */
export function isAdministrator(roles: string | null | undefined): boolean {
  if (!roles) return false;
  return roles
    .split(',')
    .map((r) => r.trim())
    .includes(ADMIN_ROLE_NAME);
}
