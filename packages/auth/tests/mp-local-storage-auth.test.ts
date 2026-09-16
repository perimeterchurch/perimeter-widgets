import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MPLocalStorageAuth, detectMPAppRoot } from '../src/mp-local-storage-auth';

const ID_KEY = 'mpp-widgets_IdToken';

const TOKEN_KEY = 'mpp-widgets_AuthToken';
const EXP_KEY = 'mpp-widgets_ExpiresAfter';

describe('MPLocalStorageAuth', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when no token is present', () => {
    const auth = new MPLocalStorageAuth();
    expect(auth.getToken()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('returns the token when present and not expired', () => {
    localStorage.setItem(TOKEN_KEY, 'abc');
    localStorage.setItem(EXP_KEY, String(Date.now() + 60_000));
    const auth = new MPLocalStorageAuth();
    expect(auth.getToken()).toBe('abc');
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('treats an expired token as no token', () => {
    localStorage.setItem(TOKEN_KEY, 'abc');
    localStorage.setItem(EXP_KEY, String(Date.now() - 1));
    const auth = new MPLocalStorageAuth();
    expect(auth.getToken()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  // The WordPress MP OAuth plugin writes mpp-widgets_ExpiresAfter as an ISO
  // date string (docs/guides/authentication.md), NOT epoch ms — these pin the
  // real-world format the producer actually writes.
  it('accepts a future ISO-string expiry', () => {
    localStorage.setItem(TOKEN_KEY, 'abc');
    localStorage.setItem(EXP_KEY, new Date(Date.now() + 60_000).toISOString());
    const auth = new MPLocalStorageAuth();
    expect(auth.getToken()).toBe('abc');
  });

  it('treats a past ISO-string expiry as expired', () => {
    localStorage.setItem(TOKEN_KEY, 'abc');
    localStorage.setItem(EXP_KEY, new Date(Date.now() - 60_000).toISOString());
    const auth = new MPLocalStorageAuth();
    expect(auth.getToken()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  // MPWidgets itself writes ExpiresAfter via String(new Date(...)) — the native
  // Date.prototype.toString() format (e.g. "Wed Jul 09 2026 12:00:00 GMT-0400
  // (Eastern Daylight Time)"), NOT ISO. Date.parse accepts it in every engine
  // we target — pin that so it can never silently regress.
  it("accepts MPWidgets' native Date.toString() ExpiresAfter format", () => {
    const future = new Date(Date.now() + 3_600_000).toString(); // e.g. "Wed Jul 09 2026 …"
    localStorage.setItem(TOKEN_KEY, 'tok');
    localStorage.setItem(EXP_KEY, future);
    const auth = new MPLocalStorageAuth();
    expect(auth.getToken()).toBe('tok');
  });

  it('treats an expired native-format ExpiresAfter as signed out', () => {
    const past = new Date(Date.now() - 3_600_000).toString();
    localStorage.setItem(TOKEN_KEY, 'tok');
    localStorage.setItem(EXP_KEY, past);
    const auth = new MPLocalStorageAuth();
    expect(auth.getToken()).toBeNull();
  });

  it('treats an unparseable expiry as expired, not valid forever', () => {
    localStorage.setItem(TOKEN_KEY, 'abc');
    localStorage.setItem(EXP_KEY, 'not-a-date');
    const auth = new MPLocalStorageAuth();
    expect(auth.getToken()).toBeNull();
  });

  it('treats the literal string "null" token (WP plugin sign-out) as signed out', () => {
    localStorage.setItem(TOKEN_KEY, 'null');
    localStorage.setItem(EXP_KEY, new Date(Date.now() + 60_000).toISOString());
    const auth = new MPLocalStorageAuth();
    expect(auth.getToken()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('notifies onChange listeners when a "storage" event fires for the token key', () => {
    const auth = new MPLocalStorageAuth({ pollIntervalMs: 0 });
    const cb = vi.fn();
    const off = auth.onChange(cb);
    localStorage.setItem(TOKEN_KEY, 'new');
    window.dispatchEvent(new StorageEvent('storage', { key: TOKEN_KEY, newValue: 'new' }));
    expect(cb).toHaveBeenCalledWith('new');
    off();
  });

  it('polls localStorage when pollIntervalMs > 0', () => {
    vi.useFakeTimers();
    const auth = new MPLocalStorageAuth({ pollIntervalMs: 100 });
    const cb = vi.fn();
    auth.onChange(cb);
    localStorage.setItem(TOKEN_KEY, 'polled');
    vi.advanceTimersByTime(150);
    expect(cb).toHaveBeenCalledWith('polled');
  });

  it('respects custom token/expires keys', () => {
    localStorage.setItem('custom_token', 'X');
    localStorage.setItem('custom_exp', String(Date.now() + 60_000));
    const auth = new MPLocalStorageAuth({ tokenKey: 'custom_token', expiresKey: 'custom_exp' });
    expect(auth.getToken()).toBe('X');
  });

  describe('silent refresh (MPWidgets REAUTH)', () => {
    const ROOT = 'https://mp.example.org/widgets';
    const config = {
      signInUrl: 'https://mp.example.org/ministryplatformapi/oauth/connect/authorize',
      responseType: 'code',
      scope: 'openid http://www.thinkministry.com/dataplatform/scopes/all',
      clientId: 'TM.Widgets',
      redirectUrl: 'https://mp.example.org/widgets/signin-oidc',
      nonce: 'n0nce',
    };
    const fetchMock = vi.fn();

    function jsonResponse(body: unknown, ok = true): Response {
      return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) } as Response;
    }

    function signedIn(expiresInMs: number): void {
      localStorage.setItem(TOKEN_KEY, 'old-token');
      localStorage.setItem(ID_KEY, 'old-id');
      localStorage.setItem(EXP_KEY, new Date(Date.now() + expiresInMs).toString());
    }

    beforeEach(() => {
      vi.stubGlobal('fetch', fetchMock);
      fetchMock.mockReset();
      fetchMock.mockImplementation((input: string, init?: RequestInit) => {
        if (input.endsWith('/Api/Auth')) return Promise.resolve(jsonResponse(config));
        expect(init?.credentials).toBe('include');
        return Promise.resolve(
          jsonResponse({
            accessToken: 'new-token',
            idToken: 'new-id',
            expiresIn: 1800,
            state: 'REAUTH',
          }),
        );
      });
      window.mppw_refreshTokenPromise = null;
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('detects the MP app root from the MPWidgets script tag', () => {
      const script = document.createElement('script');
      script.src = 'https://mp.example.org/widgets/dist/MPWidgets.js';
      document.head.appendChild(script);
      expect(detectMPAppRoot()).toBe('https://mp.example.org/widgets');
      script.remove();
      expect(detectMPAppRoot()).toBeNull();
    });

    it('renews the token before it expires and writes the three MPWidgets keys', async () => {
      signedIn(60_000); // inside the 120 s lead
      const auth = new MPLocalStorageAuth({ pollIntervalMs: 0, mpAppRoot: ROOT });
      const cb = vi.fn();
      auth.onChange(cb);
      await auth.refreshIfNeeded();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0]?.[0]).toBe(`${ROOT}/Api/Auth`);
      const reauthUrl = String(fetchMock.mock.calls[1]?.[0]);
      expect(reauthUrl.startsWith(config.signInUrl)).toBe(true);
      expect(reauthUrl).toContain('client_id=TM.Widgets');
      expect(reauthUrl).toContain('state=REAUTH');
      expect(localStorage.getItem(TOKEN_KEY)).toBe('new-token');
      expect(localStorage.getItem(ID_KEY)).toBe('new-id');
      const exp = Date.parse(localStorage.getItem(EXP_KEY)!);
      // expiresIn minus MPWidgets' one-minute margin.
      expect(exp - Date.now()).toBeGreaterThan(1_700_000);
      expect(exp - Date.now()).toBeLessThanOrEqual(1_740_000);
      expect(auth.getToken()).toBe('new-token');
      expect(cb).toHaveBeenCalledWith('new-token');
    });

    it('renews a token that has just expired, so a 30-minute lapse does not sign the member out', async () => {
      signedIn(-5_000);
      const auth = new MPLocalStorageAuth({ pollIntervalMs: 0, mpAppRoot: ROOT });
      expect(auth.getToken()).toBeNull();
      await auth.refreshIfNeeded();
      expect(auth.getToken()).toBe('new-token');
    });

    it('does nothing when the token is comfortably valid', async () => {
      signedIn(20 * 60_000);
      const auth = new MPLocalStorageAuth({ pollIntervalMs: 0, mpAppRoot: ROOT });
      await auth.refreshIfNeeded();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does nothing without an id token (signed out) or without an MP app root', async () => {
      localStorage.setItem(TOKEN_KEY, 'old-token');
      localStorage.setItem(EXP_KEY, new Date(Date.now() - 1000).toString());
      await new MPLocalStorageAuth({ pollIntervalMs: 0, mpAppRoot: ROOT }).refreshIfNeeded();
      expect(fetchMock).not.toHaveBeenCalled();

      localStorage.setItem(ID_KEY, 'old-id');
      await new MPLocalStorageAuth({ pollIntervalMs: 0, mpAppRoot: false }).refreshIfNeeded();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not renew a token that expired more than a day ago', async () => {
      signedIn(-25 * 60 * 60_000);
      await new MPLocalStorageAuth({ pollIntervalMs: 0, mpAppRoot: ROOT }).refreshIfNeeded();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('leaves the member signed out and backs off when MP refuses', async () => {
      signedIn(-1000);
      fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({}, false)));
      const auth = new MPLocalStorageAuth({ pollIntervalMs: 0, mpAppRoot: ROOT });
      await auth.refreshIfNeeded();
      expect(auth.getToken()).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await auth.refreshIfNeeded(); // within the retry window: no second attempt
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("joins MPWidgets' own in-flight refresh instead of firing a second one", async () => {
      signedIn(-1000);
      let release!: () => void;
      window.mppw_refreshTokenPromise = new Promise<void>((r) => {
        release = () => {
          localStorage.setItem(TOKEN_KEY, 'mp-token');
          localStorage.setItem(EXP_KEY, new Date(Date.now() + 1_740_000).toString());
          r();
        };
      });
      const auth = new MPLocalStorageAuth({ pollIntervalMs: 0, mpAppRoot: ROOT });
      const pending = auth.refreshIfNeeded();
      release();
      await pending;
      expect(fetchMock).not.toHaveBeenCalled();
      expect(auth.getToken()).toBe('mp-token');
    });

    it('refreshes from the poll without anyone calling refreshIfNeeded', async () => {
      vi.useFakeTimers();
      signedIn(60_000);
      const auth = new MPLocalStorageAuth({ pollIntervalMs: 100, mpAppRoot: ROOT });
      await vi.advanceTimersByTimeAsync(150);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(localStorage.getItem(TOKEN_KEY)).toBe('new-token');
      auth.dispose();
    });
  });
});
