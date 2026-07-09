import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MPLocalStorageAuth } from '../src/mp-local-storage-auth';

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
});
