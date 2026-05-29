import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export function middleware(req: NextRequest): NextResponse | undefined {
  const sessionToken = getSessionCookie(req, { cookiePrefix: 'studio' });
  if (sessionToken) return;
  return NextResponse.redirect(new URL('/admin/login', req.url));
}

export const config = {
  // Gate the bare /admin path AND every nested /admin/* except /admin/login.
  // Without the bare-path entry the negative-lookahead matcher requires at
  // least one trailing character, leaving /admin itself ungated.
  matcher: ['/admin', '/admin/((?!login).*)'],
};
