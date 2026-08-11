'use client';

import { type CSSProperties } from 'react';
import { authClient } from '@/lib/auth/auth-client';

const wrap: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1rem',
  padding: '2rem',
  maxWidth: 640,
  margin: '0 auto',
  textAlign: 'center',
  background: '#1c1917',
  color: '#fafaf9',
  fontFamily: 'system-ui, sans-serif',
};
const button: CSSProperties = {
  font: 'inherit',
  padding: '0.6rem 1.2rem',
  borderRadius: 8,
  border: '1px solid #57534e',
  background: 'transparent',
  color: '#fafaf9',
  cursor: 'pointer',
};

export default function UnauthorizedPage() {
  const signOutAndRetry = async () => {
    await authClient.signOut();
    // signedout=1 so /signin doesn't immediately SSO the same account back in.
    window.location.href = '/signin?signedout=1';
  };

  return (
    <main style={wrap}>
      <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Access not permitted</h1>
      <p style={{ margin: 0, color: '#d6d3d1', lineHeight: 1.5 }}>
        Your Ministry Platform account doesn&rsquo;t have access to Perimeter Studio. Access is
        limited to the <strong>Administrators</strong> and{' '}
        <strong>Website&nbsp;Folder&nbsp;-&nbsp;Edit</strong> roles.
      </p>
      <p style={{ margin: 0, color: '#a8a29e', fontSize: '0.9rem' }}>
        If you believe you should have access, contact a Ministry Platform administrator.
      </p>
      <button style={button} onClick={() => void signOutAndRetry()}>
        Sign out and try another account
      </button>
    </main>
  );
}
