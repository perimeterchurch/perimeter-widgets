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
