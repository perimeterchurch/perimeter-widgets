import type { AuthProvider } from './types';

export interface MPLocalStorageAuthOptions {
  tokenKey?: string | undefined;
  expiresKey?: string | undefined;
  idTokenKey?: string | undefined;
  pollIntervalMs?: number | undefined;
  /**
   * Root of the MinistryPlatform widgets app (e.g. `https://mp.example.org/widgets`),
   * used for the silent token refresh. Auto-detected from the MP widgets
   * `<script>` on the page; pass `false` to disable refresh entirely.
   */
  mpAppRoot?: string | false | undefined;
  /** Renew this many seconds before `ExpiresAfter`. */
  refreshLeadSeconds?: number | undefined;
}

const DEFAULT_TOKEN_KEY = 'mpp-widgets_AuthToken';
const DEFAULT_EXP_KEY = 'mpp-widgets_ExpiresAfter';
const DEFAULT_ID_TOKEN_KEY = 'mpp-widgets_IdToken';
const DEFAULT_POLL = 1000;
const DEFAULT_REFRESH_LEAD_SECONDS = 120;
/** After a failed refresh, wait this long before trying again. */
const REFRESH_RETRY_MS = 60_000;
/** A token expired longer ago than this is not worth renewing — the MP session is surely gone. */
const REFRESH_MAX_STALE_MS = 24 * 60 * 60 * 1000;

interface MPAuthConfiguration {
  signInUrl: string;
  responseType: string;
  scope: string;
  clientId: string;
  redirectUrl: string;
  nonce: string;
}

interface MPRefreshedTokens {
  accessToken?: string | null;
  idToken?: string | null;
  expiresIn?: number | null;
}

declare global {
  interface Window {
    /** MPWidgets' own in-flight refresh; shared so two refreshers never race. */
    mppw_refreshTokenPromise?: Promise<unknown> | null;
  }
}

/**
 * Find the MP widgets app root the way MPWidgets does: the `<script>` that
 * loaded `…/widgets/dist/MPWidgets.js` (or `UserLogin.js`).
 */
export function detectMPAppRoot(doc: Document = document): string | null {
  for (const script of Array.from(doc.scripts)) {
    const match = /^(.*)\/dist\/(?:MPWidgets|UserLogin)\.[^/]*$/.exec(script.src);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Reads the MinistryPlatform login widget's token from localStorage and keeps
 * it fresh.
 *
 * MP's widgets renew their 30-minute access token silently — a `credentials:
 * include` GET of the authorize endpoint with `state=REAUTH`, answered with
 * JSON tokens because the MP session cookie is still valid — but only when
 * one of *their* widgets is about to make a request. A page with only our
 * widgets would otherwise sign out mid-registration while the login widget
 * still shows the member's name. This provider performs the same renewal a
 * couple of minutes before expiry, writing the same three localStorage keys,
 * so MP's widgets and ours stay in step.
 */
export class MPLocalStorageAuth implements AuthProvider {
  private readonly tokenKey: string;
  private readonly expiresKey: string;
  private readonly idTokenKey: string;
  private readonly pollMs: number;
  private readonly refreshLeadMs: number;
  private readonly mpAppRoot: string | null;
  private listeners = new Set<(token: string | null) => void>();
  private lastNotified: string | null;
  private storageHandler: (e: StorageEvent) => void;
  private pollHandle: ReturnType<typeof setInterval> | null = null;
  private refreshing: Promise<void> | null = null;
  private refreshFailedAt = 0;

  constructor(opts: MPLocalStorageAuthOptions = {}) {
    this.tokenKey = opts.tokenKey ?? DEFAULT_TOKEN_KEY;
    this.expiresKey = opts.expiresKey ?? DEFAULT_EXP_KEY;
    this.idTokenKey = opts.idTokenKey ?? DEFAULT_ID_TOKEN_KEY;
    this.pollMs = opts.pollIntervalMs ?? DEFAULT_POLL;
    this.refreshLeadMs = (opts.refreshLeadSeconds ?? DEFAULT_REFRESH_LEAD_SECONDS) * 1000;
    this.mpAppRoot =
      opts.mpAppRoot === false
        ? null
        : (opts.mpAppRoot ?? (typeof document !== 'undefined' ? detectMPAppRoot() : null));
    this.lastNotified = this.getToken();
    this.storageHandler = (e) => {
      if (e.key === this.tokenKey || e.key === this.expiresKey) this.maybeNotify();
    };
    window.addEventListener('storage', this.storageHandler);
    if (this.pollMs > 0) {
      this.pollHandle = setInterval(() => this.tick(), this.pollMs);
    }
  }

  getToken(): string | null {
    const raw = localStorage.getItem(this.tokenKey);
    if (raw == null) return null;
    // The WordPress MP OAuth plugin writes the literal string "null" on
    // sign-out — that is a signed-out state, not a token.
    if (raw === 'null') return null;
    const exp = this.expiresAt();
    if (exp !== null && (Number.isNaN(exp) || Date.now() > exp)) return null;
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

  /**
   * Renew the token now if it is about to expire (or just has) and the member
   * has not signed out. Resolves when the attempt is over; never throws.
   */
  refreshIfNeeded(): Promise<void> {
    if (!this.shouldRefresh()) return Promise.resolve();
    return this.refresh();
  }

  /** Epoch ms of `ExpiresAfter`; null when absent; NaN when unparseable. */
  private expiresAt(): number | null {
    const expStr = localStorage.getItem(this.expiresKey);
    if (expStr == null || expStr === 'null') return null;
    // The plugin writes an ISO date string (see docs/guides/authentication.md)
    // and MPWidgets writes Date.prototype.toString(); epoch-ms is accepted as
    // a fallback. An expiry that parses as neither is treated as EXPIRED —
    // returning a token whose expiry we cannot read would hand out stale
    // credentials forever.
    return Number.isFinite(Number(expStr)) ? Number(expStr) : Date.parse(expStr);
  }

  private shouldRefresh(): boolean {
    if (this.mpAppRoot === null || this.refreshing !== null) return false;
    if (Date.now() - this.refreshFailedAt < REFRESH_RETRY_MS) return false;
    const raw = localStorage.getItem(this.tokenKey);
    const idToken = localStorage.getItem(this.idTokenKey);
    // No id token means MP never signed this browser in, or signed it out.
    if (raw == null || raw === 'null' || idToken == null || idToken === 'null') return false;
    const exp = this.expiresAt();
    if (exp === null || Number.isNaN(exp)) return false;
    const now = Date.now();
    return exp - now < this.refreshLeadMs && now - exp < REFRESH_MAX_STALE_MS;
  }

  private refresh(): Promise<void> {
    // Share MPWidgets' in-flight promise (and let it share ours) so a page
    // with both never fires two REAUTH requests.
    const inFlight = typeof window !== 'undefined' ? window.mppw_refreshTokenPromise : null;
    const run = inFlight ? inFlight.then(() => undefined) : this.performRefresh();
    if (!inFlight && typeof window !== 'undefined') {
      window.mppw_refreshTokenPromise = run
        .catch(() => undefined)
        .finally(() => {
          window.mppw_refreshTokenPromise = null;
        });
    }
    this.refreshing = run
      .catch(() => {
        this.refreshFailedAt = Date.now();
      })
      .finally(() => {
        this.refreshing = null;
        this.maybeNotify();
      });
    return this.refreshing;
  }

  private async performRefresh(): Promise<void> {
    const root = this.mpAppRoot;
    if (root === null) return;
    const configRes = await fetch(`${root}/Api/Auth`);
    if (!configRes.ok) throw new Error(`MP auth configuration ${configRes.status}`);
    const cfg = (await configRes.json()) as MPAuthConfiguration;
    // Built exactly as MPWidgets builds it, `state=REAUTH` included: the
    // callback answers that state with JSON instead of a redirect.
    const url =
      `${cfg.signInUrl}?response_type=${cfg.responseType}&scope=${cfg.scope}` +
      `&client_id=${cfg.clientId}&redirect_uri=${cfg.redirectUrl}&nonce=${cfg.nonce}&state=REAUTH`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error(`MP token refresh ${res.status}`);
    const tokens = (await res.json()) as MPRefreshedTokens;
    if (!tokens.accessToken || !tokens.idToken || !tokens.expiresIn) {
      throw new Error('MP token refresh returned no tokens');
    }
    // Same shape MPWidgets writes: a Date's toString(), one minute early.
    const expires = new Date(Date.now() + (tokens.expiresIn - 60) * 1000);
    localStorage.setItem(this.tokenKey, tokens.accessToken);
    localStorage.setItem(this.idTokenKey, tokens.idToken);
    localStorage.setItem(this.expiresKey, expires.toString());
  }

  private tick(): void {
    if (this.shouldRefresh()) void this.refresh();
    this.maybeNotify();
  }

  private maybeNotify(): void {
    const current = this.getToken();
    if (current === this.lastNotified) return;
    this.lastNotified = current;
    for (const cb of this.listeners) cb(current);
  }
}
