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
