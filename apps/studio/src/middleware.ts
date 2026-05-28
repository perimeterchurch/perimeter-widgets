import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export function middleware(req: NextRequest): NextResponse | undefined {
  const sessionToken = getSessionCookie(req, { cookiePrefix: 'studio' });
  if (sessionToken) return;
  return NextResponse.redirect(new URL('/admin/login', req.url));
}

export const config = {
  matcher: ['/admin/((?!login).*)'],
};
