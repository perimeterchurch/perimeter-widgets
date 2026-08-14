import { auth } from './better-auth';

/**
 * Live authorization re-check for the studio — the studio's analogue of the
 * helpdesk BFF's `getMe()` (`src/lib/auth/get-me.ts`).
 *
 * WHY THIS EXISTS
 * ---------------
 * The studio session is a stateless Better Auth cookie: there is no database, so
 * the `roles` CSV written at sign-in is the ONLY thing the shell knows about
 * authorization, and it stays true for the cookie's whole 7-day life. Revoking
 * someone's MP role therefore did nothing until their cookie expired — they kept
 * studio access, and (for role 2) impersonation with it.
 *
 * So we re-read the user's MP security roles per request from
 * perimeter-api's `/api/auth/roles`, which resolves them from `dp_User_Roles`
 * and caches on its VOLATILE TTL. Same shape as helpdesk: ask perimeter-api
 * "what is this caller allowed to do", cache the answer briefly, gate on it.
 * A revocation now lands within ~60s (this cache) + ~60s (perimeter-api's).
 *
 * WHY IT DOESN'T LOCK EVERYONE OUT
 * --------------------------------
 * `fetchRoleIds` distinguishes two upstream failures, because they mean opposite
 * things:
 *
 *   - 401/403 — the MP token was rejected. The user's credential is genuinely no
 *     good, so this is authoritative: `RolesRejectedError`, and the caller signs
 *     them out.
 *   - anything else (5xx, timeout, DNS) — perimeter-api is unwell and has told
 *     us nothing about this user. `RolesUnavailableError`, and the caller falls
 *     back to the signed `roles` claim from sign-in (see `access.ts`). A
 *     perimeter-api outage must not lock every administrator out of the studio;
 *     the cost is that revocation lag stretches back toward cookie lifetime for
 *     as long as the outage lasts, which is logged.
 */

/** perimeter-api ORIGIN — local dev default, prod is api.perimeter.org. */
function perimeterApiUrl(): string {
  return process.env.PERIMETER_API_URL || 'http://localhost:5500';
}

/** The user's MP token is unavailable — cookie truncated, or refresh failed. */
export class TokenUnavailableError extends Error {
  constructor() {
    super('MP access token unavailable in session');
    this.name = 'TokenUnavailableError';
  }
}

/** Upstream authoritatively rejected the caller's MP token. Fail closed. */
export class RolesRejectedError extends Error {
  constructor(public readonly status: number) {
    super(`/api/auth/roles rejected the caller: ${status}`);
    this.name = 'RolesRejectedError';
  }
}

/** Upstream couldn't answer. Caller should fall back, not lock out. */
export class RolesUnavailableError extends Error {
  constructor(public readonly reason: string) {
    super(`/api/auth/roles unavailable: ${reason}`);
    this.name = 'RolesUnavailableError';
  }
}

export interface RolesResult {
  userId: number;
  roleIds: number[];
}

/**
 * Module-level TTL cache so callers in the same serverless instance share one
 * answer. Keyed on `session.session.id`, which is stable across Better Auth's
 * silent session refreshes.
 *
 * 60s, matching the helpdesk `getMe` LRU and perimeter-api's VOLATILE TTL. Hand-
 * rolled rather than `lru-cache` to keep this package's dependency set at
 * `next` + `react` + `better-auth`; `MAX_ENTRIES` is the eviction backstop the
 * LRU would otherwise provide (oldest-inserted first — insertion order is
 * enough here because entries are immutable and short-lived).
 */
const TTL_MS = 60_000;
const MAX_ENTRIES = 500;
const cache = new Map<string, { value: RolesResult; expiresAt: number }>();

function cacheGet(key: string, now: number): RolesResult | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= now) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key: string, value: RolesResult, now: number): void {
  if (cache.size >= MAX_ENTRIES) {
    // Evict expired entries first; if none are, drop the oldest insertion.
    for (const [k, v] of cache) {
      if (v.expiresAt <= now) cache.delete(k);
    }
    if (cache.size >= MAX_ENTRIES) {
      const oldest = cache.keys().next();
      if (!oldest.done) cache.delete(oldest.value);
    }
  }
  cache.set(key, { value, expiresAt: now + TTL_MS });
}

function isRolesResult(value: unknown): value is RolesResult {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.userId === 'number' &&
    Array.isArray(v.roleIds) &&
    v.roleIds.every((id) => typeof id === 'number')
  );
}

/**
 * Resolve the signed-in user's MP `User_ID` and security `Role_ID`s.
 *
 * Takes the session (for the cache key) and the request headers (so Better Auth
 * can read the JWE-encoded account cookie when fetching the MP access token).
 *
 * @throws TokenUnavailableError  no MP token in the session
 * @throws RolesRejectedError     upstream rejected the token (fail closed)
 * @throws RolesUnavailableError  upstream unreachable (caller should fall back)
 */
export async function getRoleIds(
  session: { session: { id: string }; user: { id: string } },
  headers: Headers,
): Promise<RolesResult> {
  const now = Date.now();
  const cacheKey = session.session.id;
  const cached = cacheGet(cacheKey, now);
  if (cached) return cached;

  let accessToken: string | undefined;
  try {
    const token = await auth.api.getAccessToken({
      body: { providerId: 'ministryplatform', userId: session.user.id },
      headers,
    });
    accessToken = token?.accessToken;
  } catch {
    throw new TokenUnavailableError();
  }
  if (!accessToken) throw new TokenUnavailableError();

  let upstream: Response;
  try {
    upstream = await fetch(new URL('/api/auth/roles', perimeterApiUrl()), {
      headers: { Authorization: `Bearer ${accessToken}`, accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
  } catch (e) {
    throw new RolesUnavailableError(e instanceof Error ? e.message : 'fetch failed');
  }

  // 401/403 are authoritative: the MP token itself was refused.
  if (upstream.status === 401 || upstream.status === 403) {
    throw new RolesRejectedError(upstream.status);
  }
  if (!upstream.ok) {
    throw new RolesUnavailableError(`HTTP ${upstream.status}`);
  }

  const body: unknown = await upstream.json().catch(() => null);
  // perimeter-api wraps in `{ success, data }`; accept a bare body too, in case
  // the envelope ever changes.
  const candidate = body !== null && typeof body === 'object' && 'data' in body ? body.data : body;

  if (!isRolesResult(candidate)) {
    // A malformed body is an upstream fault, not a verdict on the user — treat
    // it as "unavailable" so it falls back rather than locking people out.
    throw new RolesUnavailableError('unexpected response shape');
  }

  cacheSet(cacheKey, candidate, now);
  return candidate;
}

/** Test-only: reset the module-level cache between cases. */
export function _clearCacheForTests(): void {
  cache.clear();
}
