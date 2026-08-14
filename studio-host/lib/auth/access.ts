import { auth } from './better-auth';
import {
  getRoleIds,
  RolesRejectedError,
  RolesUnavailableError,
  TokenUnavailableError,
} from './get-roles';
import { ADMIN_ROLE_NAME, authorizeRoles, authorizeRoleIds, isAdministratorRoleIds } from './roles';

/**
 * The single place that answers "may this request proceed, and is the caller an
 * administrator?" — used by the wall (`/api/session-check`, via middleware) and
 * by every route that needs an authorization decision.
 *
 * Both questions are answered from LIVE MP roles (`get-roles.ts`) rather than
 * from the sign-in-time `roles` CSV baked into the session cookie, so revoking
 * an MP role takes effect in about a minute instead of whenever the cookie
 * happens to expire.
 */

export type AccessDecision =
  | { status: 'unauthenticated' }
  | { status: 'forbidden'; email: string }
  | {
      status: 'ok';
      email: string;
      name: string;
      isAdmin: boolean;
      /** MP `User_ID`, when the live check succeeded. */
      userId: number | null;
      /**
       * True when the live re-check couldn't run and this decision came from the
       * signed sign-in claim instead. Callers may log it; nothing gates on it.
       */
      degraded: boolean;
    };

type SessionLike = {
  session: { id: string };
  user: { id: string; email: string; name: string };
};

/**
 * Resolve the caller's access from their request headers.
 *
 * Order of operations:
 *   1. Verify the session for real (signature + expiry) via Better Auth.
 *   2. Re-read MP roles live and gate on role IDs.
 *   3. If step 2 can't run because perimeter-api is unreachable, fall back to
 *      the `roles` CSV the OAuth callback wrote — signed, but as stale as the
 *      cookie. Marked `degraded` and logged.
 *
 * A rejected MP token (`RolesRejectedError`) or a missing one
 * (`TokenUnavailableError`) resolves to `unauthenticated`, NOT `forbidden`: the
 * credential is the problem, so the right response is to sign in again.
 */
export async function resolveAccess(headers: Headers): Promise<AccessDecision> {
  const session = (await auth.api.getSession({ headers })) as SessionLike | null;
  if (!session) return { status: 'unauthenticated' };

  const email = session.user.email ?? '';
  const name = session.user.name ?? '';
  const claim = (session.user as { roles?: string | null }).roles;

  try {
    const { userId, roleIds } = await getRoleIds(session, headers);
    if (!authorizeRoleIds(roleIds)) {
      return { status: 'forbidden', email };
    }
    return {
      status: 'ok',
      email,
      name,
      isAdmin: isAdministratorRoleIds(roleIds),
      userId,
      degraded: false,
    };
  } catch (e) {
    if (e instanceof TokenUnavailableError || e instanceof RolesRejectedError) {
      // Credential problem — send them back through sign-in.
      return { status: 'unauthenticated' };
    }
    if (e instanceof RolesUnavailableError) {
      // Upstream is unwell. Fall back to the sign-in claim rather than locking
      // out every administrator, and make the degradation visible in the logs.
      const decision = authorizeRoles(claim);
      console.warn(
        JSON.stringify({
          event: 'access.degraded',
          reason: e.reason,
          by: email,
          allowedFromClaim: decision.allowed,
        }),
      );
      if (!decision.allowed) return { status: 'forbidden', email };
      return {
        status: 'ok',
        email,
        name,
        isAdmin: decision.matched.includes(ADMIN_ROLE_NAME),
        userId: null,
        degraded: true,
      };
    }
    throw e;
  }
}

/**
 * Route-level guard for the admin-only impersonation endpoints. Returns the
 * decision when the caller is an administrator, or a ready-to-return error
 * `Response` when they aren't — so call sites stay two lines.
 */
export async function requireAdmin(
  headers: Headers,
): Promise<
  | { ok: true; access: Extract<AccessDecision, { status: 'ok' }> }
  | { ok: false; response: Response }
> {
  const access = await resolveAccess(headers);
  if (access.status === 'unauthenticated') {
    return {
      ok: false,
      response: Response.json({ error: 'unauthenticated' }, { status: 401 }),
    };
  }
  if (access.status === 'forbidden' || !access.isAdmin) {
    return { ok: false, response: Response.json({ error: 'forbidden' }, { status: 403 }) };
  }
  return { ok: true, access };
}
