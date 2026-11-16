/**
 * Better Auth < 1.7 served the generic-OAuth callback at
 * /api/auth/oauth2/callback/:id; 1.7 serves it at the core
 * /api/auth/callback/:id. MP's API client still has the old URI registered
 * (`MP_REDIRECT_PATH` in better-auth.ts pins it as the redirect_uri), so the
 * legacy route re-addresses the request before handing it to Better Auth.
 */
export function toCurrentCallback(req: Request): Request {
  const url = new URL(req.url);
  url.pathname = url.pathname.replace('/api/auth/oauth2/callback/', '/api/auth/callback/');
  return new Request(url, req);
}
