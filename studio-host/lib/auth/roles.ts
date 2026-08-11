/**
 * Role gate for the studio auth wall.
 *
 * Ministry Platform's OIDC profile (with the `scopes/all` scope) returns a
 * `roles` claim = an array of the user's security-role NAMES (verified Phase 0,
 * e.g. `["Administrators","Basic Reports", …]`). We authorize purely on that
 * claim — no MP REST lookup needed.
 *
 * Gate: allow iff the user holds "Administrators" (MP role 2) or
 * "Website Folder - Edit" (MP role 237). Role 2's name is protected in MP;
 * role 237's is editable, so a rename fails **closed** (locks out, never
 * over-grants) — acceptable, and the constant below is the single place to fix.
 */
export const ALLOWED_ROLE_NAMES = ['Administrators', 'Website Folder - Edit'] as const;

export interface RoleDecision {
  allowed: boolean;
  /** Which allowed roles the user actually holds (for display / audit). */
  matched: string[];
}

/**
 * Decide access from the OIDC `roles` claim. Defensive about shape: the claim
 * normally arrives as a string[], but we also tolerate a comma/semicolon
 * delimited string and treat anything else (absent, null, non-string) as "no
 * roles". Splitting only on `,`/`;` (never whitespace) preserves multi-word
 * names like "Website Folder - Edit".
 */
export function authorizeRoles(claim: unknown): RoleDecision {
  const roles = normalizeRoles(claim);
  const matched = ALLOWED_ROLE_NAMES.filter((name) => roles.includes(name));
  return { allowed: matched.length > 0, matched };
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
