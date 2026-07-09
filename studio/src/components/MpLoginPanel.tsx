import { useEffect, useState } from 'react';
import { MPLocalStorageAuth } from '@perimeter/auth';
import { Button } from '@perimeter/ui/button';

/**
 * Viewer-page sign-in affordance for auth widgets. Reads the SAME localStorage
 * token (via MPLocalStorageAuth) the embedded widgets poll, so the panel and
 * the widgets can never disagree — including expiry, where both flip to
 * signed-out together. Sign-in itself happens on /mp-login.html (a classic
 * page hosting the MP login widget; see the spec — MPWidgets cannot run in
 * the SPA), opened as a popup so the token lands in this origin's storage.
 */
export function MpLoginPanel({ mode }: { mode: 'required' | 'optional' }) {
  const [authed, setAuthed] = useState(false);
  const [blocked, setBlocked] = useState(false);

  // The reader is created AND disposed inside the effect: the studio renders
  // under StrictMode, whose dev double-effect would otherwise dispose a
  // memoized instance once and resubscribe to a dead reader (no storage
  // listener, no poll) — the panel would never flip after sign-in.
  useEffect(() => {
    const auth = new MPLocalStorageAuth();
    setAuthed(auth.isAuthenticated());
    const off = auth.onChange(() => setAuthed(auth.isAuthenticated()));
    return () => {
      off();
      auth.dispose();
    };
  }, []);

  const openPopup = () => {
    const popup = window.open('/mp-login.html', 'perimeter-mp-login', 'width=480,height=640');
    if (!popup) setBlocked(true);
  };

  if (authed) {
    return (
      <section
        role="region"
        aria-label="Sign-in status"
        className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted px-4 py-2"
      >
        <p className="text-sm text-fg">Signed in — this widget is showing your live data.</p>
        <Button type="button" variant="outline" size="sm" onClick={openPopup}>
          Manage sign-in
        </Button>
      </section>
    );
  }

  const prominent = mode === 'required';
  return (
    <section
      role="region"
      aria-label="Sign-in status"
      className={
        prominent
          ? 'space-y-2 rounded-md border border-border bg-muted p-4'
          : 'flex items-center justify-between gap-3 rounded-md border border-border px-4 py-2'
      }
    >
      <p className={prominent ? 'text-sm font-medium text-fg' : 'text-sm text-muted-fg'}>
        {prominent
          ? 'This widget requires a signed-in Perimeter account.'
          : 'Sign in to see personalized data.'}
      </p>
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" onClick={openPopup}>
          Sign in
        </Button>
        {blocked && (
          <a className="text-sm underline" href="/mp-login.html" target="_blank" rel="noreferrer">
            Open the sign-in page
          </a>
        )}
      </div>
    </section>
  );
}
