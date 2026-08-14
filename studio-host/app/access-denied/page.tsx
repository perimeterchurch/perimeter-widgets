'use client';

/**
 * Shown to a user who signed in successfully but whose Ministry Platform roles
 * don't admit them to the studio. Same card and copy shape as helpdesk's
 * `/access-denied`, with the studio's roles named instead of agent status.
 *
 * One deliberate behavioural difference: helpdesk's "sign in as a different user"
 * is a plain `<Link href="/sign-in">`, which it can afford because it has no
 * sign-out at all. Here that link would be a trap — MP's SSO session is still
 * live, so signing in again would silently return the SAME rejected account and
 * land you right back on this page. So it runs a real sign-out (ending the MP
 * session) and then goes to /sign-in. It still LOOKS like helpdesk's link.
 */
export default function AccessDeniedPage() {
  const signOutAndRetry = async () => {
    let redirectTo = '/sign-in';
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      const data = (await res.json().catch(() => null)) as { redirectTo?: string } | null;
      if (data?.redirectTo) redirectTo = data.redirectTo;
    } catch {
      /* fall back to /sign-in */
    }
    window.location.href = redirectTo;
  };

  return (
    <main className="auth-main">
      <div className="auth-card auth-card--centered">
        <h1 className="auth-title">Access denied</h1>
        <p className="auth-body">
          Your account is signed in, but it doesn&apos;t have access to Perimeter Studio. Access is
          limited to the <strong>Administrators</strong> and{' '}
          <strong>Website&nbsp;Folder&nbsp;-&nbsp;Edit</strong> Ministry Platform roles. If you
          believe this is incorrect, contact TechOps.
        </p>
        <button className="auth-link" onClick={() => void signOutAndRetry()}>
          Sign in as a different user
        </button>
      </div>
    </main>
  );
}
