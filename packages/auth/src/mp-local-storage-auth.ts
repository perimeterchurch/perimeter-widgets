import type { AuthProvider } from './types';

export interface MPLocalStorageAuthOptions {
  tokenKey?: string | undefined;
  expiresKey?: string | undefined;
  pollIntervalMs?: number | undefined;
}

const DEFAULT_TOKEN_KEY = 'mpp-widgets_AuthToken';
const DEFAULT_EXP_KEY = 'mpp-widgets_ExpiresAfter';
const DEFAULT_POLL = 1000;

export class MPLocalStorageAuth implements AuthProvider {
  private readonly tokenKey: string;
  private readonly expiresKey: string;
  private readonly pollMs: number;
  private listeners = new Set<(token: string | null) => void>();
  private lastNotified: string | null;
  private storageHandler: (e: StorageEvent) => void;
  private pollHandle: ReturnType<typeof setInterval> | null = null;

  constructor(opts: MPLocalStorageAuthOptions = {}) {
    this.tokenKey = opts.tokenKey ?? DEFAULT_TOKEN_KEY;
    this.expiresKey = opts.expiresKey ?? DEFAULT_EXP_KEY;
    this.pollMs = opts.pollIntervalMs ?? DEFAULT_POLL;
    this.lastNotified = this.getToken();
    this.storageHandler = (e) => {
      if (e.key === this.tokenKey || e.key === this.expiresKey) this.maybeNotify();
    };
    window.addEventListener('storage', this.storageHandler);
    if (this.pollMs > 0) {
      this.pollHandle = setInterval(() => this.maybeNotify(), this.pollMs);
    }
  }

  getToken(): string | null {
    const raw = localStorage.getItem(this.tokenKey);
    if (raw == null) return null;
    // The WordPress MP OAuth plugin writes the literal string "null" on
    // sign-out — that is a signed-out state, not a token.
    if (raw === 'null') return null;
    const expStr = localStorage.getItem(this.expiresKey);
    if (expStr != null) {
      // The plugin writes an ISO date string (see docs/guides/authentication.md);
      // epoch-ms is accepted as a fallback. An expiry that parses as neither is
      // treated as EXPIRED — returning a token whose expiry we cannot read would
      // hand out stale credentials forever.
      const exp = Number.isFinite(Number(expStr)) ? Number(expStr) : Date.parse(expStr);
      if (Number.isNaN(exp) || Date.now() > exp) return null;
    }
    return raw;
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  onChange(cb: (token: string | null) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  /** Stop polling and listening. Used by tests and on widget unmount. */
  dispose(): void {
    window.removeEventListener('storage', this.storageHandler);
    if (this.pollHandle != null) clearInterval(this.pollHandle);
    this.listeners.clear();
  }

  private maybeNotify(): void {
    const current = this.getToken();
    if (current === this.lastNotified) return;
    this.lastNotified = current;
    for (const cb of this.listeners) cb(current);
  }
}
