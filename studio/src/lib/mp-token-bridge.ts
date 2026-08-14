/**
 * Bridge the studio's SITE session (Better Auth, via the Next auth shell) into
 * the WIDGET auth model.
 *
 * Auth-gated widgets (My Giving History, My Shepherds) read an MP access token
 * from `localStorage['mpp-widgets_AuthToken']` — the same key WordPress
 * populates in production. When the studio runs behind the shell, the user has
 * already authenticated with Ministry Platform, so `/api/mp-token` can hand back
 * their MP access token; we write it (and its expiry) to localStorage so
 * `MPLocalStorageAuth` treats them as signed in and the widgets show live data
 * without a separate per-widget sign-in.
 *
 * Inert outside the shell: standalone Vite dev and the Playwright visual suite
 * answer `/api/mp-token` with the SPA's index.html (not JSON), so we bail and
 * leave widget auth untouched — no behaviour or visual-baseline change there.
 *
 * Security note: this mirrors the established production model (an MP token in
 * localStorage). The studio is gated to authorised users, and the token is the
 * viewer's own — the same exposure WordPress already has.
 */
const TOKEN_KEY = 'mpp-widgets_AuthToken';
const EXP_KEY = 'mpp-widgets_ExpiresAfter';

/**
 * Remove the bridged token on sign-out.
 *
 * The server can clear its own cookies but not localStorage, so without this a
 * "signed out" browser kept a live MP access token — and any widget that reads
 * `MPLocalStorageAuth` went on treating the user as signed in until the token
 * expired on its own. Called by `AccountMenu` before it hits `/api/auth/logout`.
 */
export function clearBridgedMpToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXP_KEY);
  } catch {
    /* localStorage unavailable (private mode, blocked) — nothing to clear */
  }
}

export async function bridgeMpToken(): Promise<void> {
  try {
    const res = await fetch('/api/mp-token', { headers: { accept: 'application/json' } });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('application/json')) return;
    const data = (await res.json().catch(() => null)) as {
      token?: string;
      expiresAt?: string | null;
    } | null;
    if (!data?.token) return;
    localStorage.setItem(TOKEN_KEY, data.token);
    if (data.expiresAt) localStorage.setItem(EXP_KEY, data.expiresAt);
  } catch {
    /* no shell reachable — leave widget auth untouched */
  }
}
