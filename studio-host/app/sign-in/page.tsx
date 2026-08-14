import { cookies as nextCookies } from 'next/headers';
import { SIGNED_OUT_COOKIE } from '@/lib/auth/config';
import SignInClient from './sign-in-client';

/**
 * Server shell for the sign-in page, at `/sign-in` to match helpdesk.
 *
 * Reads the httpOnly cookie `/api/auth/logout` sets so a visitor who just signed
 * out is told so, rather than shown a bare prompt. Reading it here rather than
 * from a query parameter is what makes that survive a refresh, a bookmark, and
 * the back button.
 */
export default async function SignInPage() {
  const cookieStore = await nextCookies();
  const signedOut = cookieStore.get(SIGNED_OUT_COOKIE)?.value === '1';
  return <SignInClient signedOut={signedOut} />;
}
