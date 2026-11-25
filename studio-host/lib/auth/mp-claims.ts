// Better Auth 1.7 validates the session cookie on every request
// (`emailVerified` boolean, `image` string or absent) and treats a cookie that
// fails as no session, so sign-in loops back to the sign-in page. It copies
// these claims from MP's profile unless mapProfileToUser sets them, and MP
// sends `email_verified` as the string "true" (found on metrics, 2026-11-25;
// knowledgebase-2.0 coerces them the same way).

/** MP's `email_verified` claim as a boolean. */
export function emailVerifiedClaim(claim: unknown): boolean {
  return claim === true || String(claim).toLowerCase() === 'true';
}

/** MP's `picture` claim when it is a non-empty string; otherwise none. */
export function imageClaim(claim: unknown): string | undefined {
  return typeof claim === 'string' && claim !== '' ? claim : undefined;
}
