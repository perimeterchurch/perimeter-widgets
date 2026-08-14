/**
 * RP-initiated logout against Ministry Platform.
 *
 * THE BUG THIS FIXES
 * ------------------
 * Sign-out used to clear only the studio's own cookies. MP's SSO session
 * survived, so the next "Sign in with Ministry Platform" completed silently and
 * the user appeared never to have signed out at all. Ending the MP session too
 * is what makes sign-out mean something.
 *
 * MP's OIDC discovery advertises an `end_session_endpoint` (verified 2026-08-14:
 * `<MP_API_BASEURL>/oauth/connect/endsession`), so we send the browser there
 * after clearing local state.
 *
 * ON `id_token_hint`
 * ------------------
 * MP runs IdentityServer, which only honours `post_logout_redirect_uri` when the
 * request carries an `id_token_hint` — without one it shows its own "do you want
 * to sign out?" interstitial and ignores the return URL. Better Auth stores the
 * ID token alongside the access token in the account cookie and returns it from
 * `getAccessToken`, so we pass it when we have it.
 *
 * The stored ID token is usually EXPIRED by the time anyone signs out (they last
 * minutes; sessions last a week). That's fine and not worth working around:
 * `id_token_hint` is validated for signature and subject, not freshness, so an
 * expired hint still identifies the session to end. If the hint is missing
 * entirely we simply lose the return hop.
 *
 * The redirect URI must also be registered in MP's client configuration for this
 * client. If it isn't, MP drops the return hop and the user lands on MP's own
 * signed-out page — still correctly signed out of both, just a worse landing.
 * `STUDIO_SKIP_MP_END_SESSION=1` opts out of the MP hop entirely (local sign-out
 * only) if that registration isn't in place yet.
 */

interface Discovery {
  end_session_endpoint?: string;
}

let cached: { endSessionEndpoint: string | null; expiresAt: number } | null = null;
const DISCOVERY_TTL_MS = 60 * 60 * 1000; // 1h — this endpoint effectively never moves

/**
 * The MP `end_session_endpoint`, from OIDC discovery. Cached for an hour, and
 * `null` when discovery is unreachable or doesn't advertise one — callers fall
 * back to a local-only sign-out.
 */
export async function endSessionEndpoint(): Promise<string | null> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.endSessionEndpoint;

  const base = process.env.MP_API_BASEURL;
  if (!base) return null;

  let endpoint: string | null = null;
  try {
    const res = await fetch(`${base}/oauth/.well-known/openid-configuration`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    if (res.ok) {
      const doc = (await res.json()) as Discovery;
      endpoint = typeof doc.end_session_endpoint === 'string' ? doc.end_session_endpoint : null;
    }
  } catch {
    endpoint = null;
  }

  cached = { endSessionEndpoint: endpoint, expiresAt: now + DISCOVERY_TTL_MS };
  return endpoint;
}

/**
 * Build the URL to send the browser to in order to end the MP session, or `null`
 * to skip the MP hop (opted out, or discovery unavailable).
 *
 * @param idToken           the user's ID token, for `id_token_hint`
 * @param postLogoutRedirect absolute URL to return to after MP signs them out
 */
export async function buildEndSessionUrl(
  idToken: string | undefined,
  postLogoutRedirect: string,
): Promise<string | null> {
  if (process.env.STUDIO_SKIP_MP_END_SESSION === '1') return null;

  const endpoint = await endSessionEndpoint();
  if (!endpoint) return null;

  const url = new URL(endpoint);
  if (idToken) {
    url.searchParams.set('id_token_hint', idToken);
    // Only meaningful alongside the hint — see the note above.
    url.searchParams.set('post_logout_redirect_uri', postLogoutRedirect);
  }
  return url.toString();
}

/** Test-only: drop the cached discovery result. */
export function _clearDiscoveryCacheForTests(): void {
  cached = null;
}
