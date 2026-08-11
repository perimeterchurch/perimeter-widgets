import { useEffect, useState } from 'react';
import { Button } from '@perimeter/ui/button';

interface SessionUser {
  name?: string;
  email?: string;
}

/**
 * Site-level sign-out — shown ONLY when the studio runs behind the Next auth
 * shell (`studio-host`), which serves this build and exposes `/api/auth/*`.
 *
 * In standalone Vite dev (`pnpm dev`) and the Playwright visual suite there is
 * no auth shell: the dev server answers `/api/auth/get-session` with the SPA's
 * `index.html` (not JSON), so the probe below finds no session and this renders
 * `null`. The header is therefore unchanged in dev/tests and the committed
 * visual baselines hold — the control only materialises in the gated deploy.
 */
export function AccountMenu() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/get-session', { headers: { accept: 'application/json' } })
      .then(async (res) => {
        const type = res.headers.get('content-type') ?? '';
        if (!res.ok || !type.includes('application/json')) return null;
        const data = (await res.json().catch(() => null)) as { user?: SessionUser } | null;
        return data?.user ?? null;
      })
      .then((u) => {
        if (active) setUser(u);
      })
      .catch(() => {
        /* no shell / no session reachable — stay hidden */
      });
    return () => {
      active = false;
    };
  }, []);

  if (!user) return null;

  const signOut = async () => {
    // Body must be valid JSON — Better Auth JSON.parses it, so an empty body
    // with an application/json content-type 500s.
    await fetch('/api/auth/sign-out', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }).catch(() => {});
    // Land on /signin in signed-out mode so it does NOT auto-bounce back through
    // MP SSO (which would silently sign the user right back in).
    window.location.href = '/signin?signedout=1';
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label="Sign out"
      title={user.email ? `Sign out (${user.email})` : 'Sign out'}
      onClick={() => void signOut()}
      className="size-9 shrink-0 p-0 text-chrome-fg"
    >
      <LogoutIcon />
    </Button>
  );
}

/** Inline glyph, matching the header's dependency-free icon style. */
function LogoutIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
