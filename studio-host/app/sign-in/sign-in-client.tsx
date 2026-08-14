'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth/auth-client';

/**
 * The studio's sign-in card — deliberately the same experience as helpdesk's
 * (`helpdesk/src/app/sign-in/page.tsx`): a card, a sentence, one button, and
 * NOTHING happens until you click it.
 *
 * WHAT CHANGED AND WHY
 * --------------------
 * This page used to start the OAuth redirect on a 400ms timer, so you never saw
 * a sign-in page at all — you got thrown to Ministry Platform and, if your MP
 * session was live, thrown straight back, having apparently never signed in.
 * That is the single biggest reason the studio didn't feel like helpdesk, and it
 * made sign-OUT feel broken too: the bounce fired again the moment you landed
 * anywhere in the studio.
 *
 * There is now no automatic redirect on any path. The `signedOut` flag therefore
 * no longer gates the bounce (there isn't one) — it only changes the copy, so
 * someone who just signed out is told so rather than being shown a bare prompt.
 */
function SignInContent({ signedOut }: { signedOut: boolean }) {
  const params = useSearchParams();
  const callbackURL = params.get('callbackUrl') || '/';
  const [starting, setStarting] = useState(false);

  const signIn = () => {
    setStarting(true);
    // Verified endpoint for this server's genericOAuth(MP) config (Phase 0):
    // /api/auth/sign-in/oauth2 with providerId. errorCallbackURL routes a
    // role-denied user to /access-denied instead of a raw error.
    void authClient.signIn.oauth2({
      providerId: 'ministryplatform',
      callbackURL,
      errorCallbackURL: '/access-denied',
    });
  };

  return (
    <main className="auth-main">
      <div className="auth-card">
        <h1 className="auth-title">Perimeter Studio</h1>
        <p className="auth-body">
          {signedOut
            ? 'You have been signed out of Perimeter Studio and Ministry Platform.'
            : 'Sign in with your Perimeter Ministry Platform account.'}
        </p>
        <button className="auth-button" onClick={signIn} disabled={starting}>
          {starting ? 'Redirecting to Ministry Platform…' : 'Sign in with Ministry Platform'}
        </button>
      </div>
    </main>
  );
}

export default function SignInClient({ signedOut }: { signedOut: boolean }) {
  return (
    <Suspense>
      <SignInContent signedOut={signedOut} />
    </Suspense>
  );
}
