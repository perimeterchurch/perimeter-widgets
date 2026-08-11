'use client';

import { Suspense, useEffect, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import { authClient, useSession } from '@/lib/auth/auth-client';

const wrap: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1rem',
  padding: '2rem',
  textAlign: 'center',
  background: '#1c1917',
  color: '#fafaf9',
  fontFamily: 'system-ui, sans-serif',
};
const button: CSSProperties = {
  font: 'inherit',
  padding: '0.6rem 1.2rem',
  borderRadius: 8,
  border: 'none',
  background: '#5b5bd6',
  color: '#fff',
  cursor: 'pointer',
};

function SignInContent() {
  const params = useSearchParams();
  const callbackURL = params.get('callbackUrl') || '/';
  // After an explicit sign-out we arrive with ?signedout=1 and must NOT
  // auto-redirect — otherwise MP SSO would silently sign the user back in.
  const signedOut = params.get('signedout') != null;
  const { data: session, isPending } = useSession();
  const [starting, setStarting] = useState(false);

  const start = () => {
    setStarting(true);
    // Verified endpoint for this server's genericOAuth(MP) config (Phase 0):
    // /api/auth/sign-in/oauth2 with providerId. errorCallbackURL routes a
    // role-denied user (Task 1.1 gate) to /unauthorized instead of a raw error.
    void authClient.signIn.oauth2({
      providerId: 'ministryplatform',
      callbackURL,
      errorCallbackURL: '/unauthorized',
    });
  };

  useEffect(() => {
    if (isPending || starting) return;
    if (session) {
      window.location.href = callbackURL;
      return;
    }
    if (signedOut) return; // stay put after an explicit sign-out
    const t = setTimeout(start, 400); // brief pause so a bounce-back can't loop instantly
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session, signedOut]);

  const message = session
    ? 'Signed in — redirecting…'
    : signedOut
      ? 'You have been signed out.'
      : starting
        ? 'Redirecting to Ministry Platform…'
        : 'Sign in to continue';

  return (
    <main style={wrap}>
      <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Perimeter Studio</h1>
      <p style={{ margin: 0, color: '#a8a29e', fontSize: '0.95rem' }}>{message}</p>
      {!session && (
        <button style={button} onClick={start}>
          Sign in with Ministry Platform
        </button>
      )}
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
