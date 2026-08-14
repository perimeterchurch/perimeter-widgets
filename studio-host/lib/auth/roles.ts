/**
 * Who may use the studio, expressed twice — once over MP role NAMES (the OIDC
 * claim available at sign-in) and once over MP role IDs (what `dp_User_Roles`
 * returns on the per-request re-check).
 *
 * Ministry Platform's OIDC profile (with the `scopes/all` scope) returns a
 * `roles` claim = an array of the user's security-role NAMES (verified Phase 0,
 * e.g. `["Administrators","Basic Reports", …]`). That claim is all we have at
 * the moment of sign-in, so `authorizeRoles` gates on names there.
 *
 * Everything AFTER sign-in gates on IDs via `authorizeRoleIds`, because names
 * are editable in MP and IDs are not. Both admit the same two roles:
 *
 *   2   Administrators          (name protected in MP)
 *   237 Website Folder - Edit   (name editable — hence the ID preference)
 *
 * Verified against `dp_Roles` 2026-08-14.
 */
export const ALLOWED_ROLE_NAMES = ['Administrators', 'Website Folder - Edit'] as const;

/** MP `Role_ID`s admitted to the studio. Same two roles as the names above. */
export const ALLOWED_ROLE_IDS = [2, 237] as const;

/** Impersonation is narrower than studio access: Administrators only. */
export const ADMIN_ROLE_ID = 2;

/**
 * The name form of {@link ADMIN_ROLE_ID}, for the one path that has only names
 * to work with: the degraded fallback in `access.ts` when the live role lookup
 * is unavailable and all we hold is the sign-in claim.
 */
export const ADMIN_ROLE_NAME = 'Administrators';

export interface RoleDecision {
  allowed: boolean;
  /** Which allowed roles the user actually holds (for display / audit). */
  matched: string[];
}

/**
 * Decide access from the OIDC `roles` claim, at sign-in. Defensive about shape:
 * the claim normally arrives as a string[], but we also tolerate a comma/
 * semicolon delimited string and treat anything else (absent, null, non-string)
 * as "no roles". Splitting only on `,`/`;` (never whitespace) preserves
 * multi-word names like "Website Folder - Edit".
 *
 * A rename of role 237 in MP makes this fail CLOSED (locks out, never
 * over-grants), and the ID-based re-check below then lets the user back in on
 * their next request — so a rename degrades to "one redundant sign-in", not a
 * lockout and not a privilege leak.
 */
export function authorizeRoles(claim: unknown): RoleDecision {
  const roles = normalizeRoles(claim);
  const matched = ALLOWED_ROLE_NAMES.filter((name) => roles.includes(name));
  return { allowed: matched.length > 0, matched };
}

/** Does this set of MP `Role_ID`s admit the user to the studio at all? */
export function authorizeRoleIds(roleIds: readonly number[]): boolean {
  return roleIds.some((id) => (ALLOWED_ROLE_IDS as readonly number[]).includes(id));
}

/** Is this set of MP `Role_ID`s allowed to impersonate (role 2 only)? */
export function isAdministratorRoleIds(roleIds: readonly number[]): boolean {
  return roleIds.includes(ADMIN_ROLE_ID);
}

function normalizeRoles(claim: unknown): string[] {
  if (Array.isArray(claim)) {
    return claim.filter((r): r is string => typeof r === 'string');
  }
  if (typeof claim === 'string') {
    return claim
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}
