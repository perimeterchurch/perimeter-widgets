import { describe, it, expect } from 'vitest';
import { authCookieNamesToExpire, requiresSecureAttribute } from './expire-cookies';

describe('authCookieNamesToExpire', () => {
  it('expires the Better Auth session token', () => {
    expect(authCookieNamesToExpire('studio.session_token=abc')).toEqual(['studio.session_token']);
  });

  // The regression this file exists for: sign-out returned no Set-Cookie, the
  // session cookie survived, and "logging out" left the user signed in.
  it('expires all four Better Auth cookies, not just the session token', () => {
    const header = [
      'studio.session_token=a',
      'studio.session_data=b',
      'studio.account_data=c',
      'studio.dont_remember=d',
    ].join('; ');
    expect(authCookieNamesToExpire(header)).toEqual([
      'studio.session_token',
      'studio.session_data',
      'studio.account_data',
      'studio.dont_remember',
    ]);
  });

  // `session_data` is the 1h cookie cache — leaving it behind can keep a session
  // resolving after the token cookie is gone.
  it('expires the cookie cache', () => {
    expect(authCookieNamesToExpire('studio.session_data=x')).toContain('studio.session_data');
  });

  // `account_data` holds three MP tokens and is split when it exceeds the
  // per-cookie size limit, so the chunks must go too.
  it('expires chunked cookies', () => {
    const header = 'studio.account_data.0=a; studio.account_data.1=b; studio.account_data.2=c';
    expect(authCookieNamesToExpire(header)).toEqual([
      'studio.account_data.0',
      'studio.account_data.1',
      'studio.account_data.2',
    ]);
  });

  it('expires __Secure-prefixed names as sent (production form)', () => {
    const header = '__Secure-studio.session_token=a; __Secure-studio.account_data.0=b';
    expect(authCookieNamesToExpire(header)).toEqual([
      '__Secure-studio.session_token',
      '__Secure-studio.account_data.0',
    ]);
  });

  it('expires the impersonation cookie — it must not survive a sign-out', () => {
    expect(authCookieNamesToExpire('studio.impersonate=68219.sig')).toEqual(['studio.impersonate']);
  });

  it('never expires the signed-out cookie the same response is setting', () => {
    const header = 'studio.session_token=a; studio.signedout=1';
    expect(authCookieNamesToExpire(header)).toEqual(['studio.session_token']);
  });

  it('leaves unrelated cookies alone', () => {
    const header = 'studio.session_token=a; _ga=x; mpp-widgets_AuthToken=y; other.session_token=z';
    expect(authCookieNamesToExpire(header)).toEqual(['studio.session_token']);
  });

  it('requires the prefix to end at a dot, not merely start the name', () => {
    expect(authCookieNamesToExpire('studiofoo=1; studio-other=2')).toEqual([]);
  });

  it('tolerates whitespace, empty pairs, and valueless cookies', () => {
    expect(authCookieNamesToExpire('  studio.session_token=a ;; studio.session_data')).toEqual([
      'studio.session_token',
      'studio.session_data',
    ]);
  });

  it('returns nothing for a missing or empty header', () => {
    expect(authCookieNamesToExpire(null)).toEqual([]);
    expect(authCookieNamesToExpire(undefined)).toEqual([]);
    expect(authCookieNamesToExpire('')).toEqual([]);
  });

  it('does not repeat a name sent twice', () => {
    expect(authCookieNamesToExpire('studio.session_token=a; studio.session_token=b')).toEqual([
      'studio.session_token',
    ]);
  });
});

describe('requiresSecureAttribute', () => {
  it('is true only for __Secure-prefixed names', () => {
    expect(requiresSecureAttribute('__Secure-studio.session_token')).toBe(true);
    expect(requiresSecureAttribute('studio.session_token')).toBe(false);
  });
});
