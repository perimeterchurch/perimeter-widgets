import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * Studio-wide impersonation state, sourced from the auth shell's `/api/me`.
 *
 * Only meaningful when the studio runs behind the shell (`studio-host`): in
 * standalone dev / the visual suite `/api/me` answers with the SPA's index.html
 * (not JSON), so `isAdmin` stays false and `targetUserId` null — the control and
 * banner render nothing and widgets fetch normally. The default context value
 * makes `useImpersonation()` safe without a provider (e.g. in unit tests).
 */
/** A candidate impersonation target from the admin user search. */
export interface ImpersonationUser {
  userID: number;
  displayName: string;
  email: string | null;
  userName?: string;
}

export interface ImpersonationState {
  /** True once `/api/me` has resolved. */
  ready: boolean;
  /** The viewer is an MP Administrator (role 2) behind the shell. */
  isAdmin: boolean;
  /** Active impersonation target User_ID, or null. */
  targetUserId: number | null;
  /** Display label for the active target (name), when known this session. Lost
   * across a full reload — falls back to the User_ID then. */
  targetLabel: string | null;
  /** Search users with a login by name / login / email (admin-gated). */
  searchUsers: (query: string) => Promise<ImpersonationUser[]>;
  /** Begin impersonating a User_ID. Returns false if the shell rejected it.
   * `label` (the picked user's name) is remembered for the active indicator. */
  start: (targetUserId: number, label?: string) => Promise<boolean>;
  /** Stop impersonating. */
  stop: () => Promise<void>;
}

const defaultState: ImpersonationState = {
  ready: false,
  isAdmin: false,
  targetUserId: null,
  targetLabel: null,
  searchUsers: () => Promise.resolve([]),
  start: () => Promise.resolve(false),
  stop: () => Promise.resolve(),
};

const ImpersonationContext = createContext<ImpersonationState>(defaultState);

export function useImpersonation(): ImpersonationState {
  return useContext(ImpersonationContext);
}

interface MeResponse {
  authenticated: boolean;
  isAdmin?: boolean;
  impersonating?: { targetUserId: number } | null;
}

async function fetchMe(): Promise<MeResponse | null> {
  try {
    const res = await fetch('/api/me', { headers: { accept: 'application/json' } });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('application/json')) return null; // no shell
    return (await res.json()) as MeResponse;
  } catch {
    return null;
  }
}

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  const [targetLabel, setTargetLabel] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchMe().then((me) => {
      if (!active) return;
      setIsAdmin(Boolean(me?.isAdmin));
      setTargetUserId(me?.impersonating?.targetUserId ?? null);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const searchUsers = useCallback(async (query: string): Promise<ImpersonationUser[]> => {
    const q = query.trim();
    if (q.length < 2) return [];
    const res = await fetch(`/api/impersonate/users?q=${encodeURIComponent(q)}`, {
      headers: { accept: 'application/json' },
    }).catch(() => null);
    if (!res || !res.ok) return [];
    const body = (await res.json().catch(() => null)) as { data?: ImpersonationUser[] } | null;
    return body?.data ?? [];
  }, []);

  const start = useCallback(async (target: number, label?: string) => {
    const res = await fetch('/api/impersonate/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targetUserId: target }),
    }).catch(() => null);
    if (!res || !res.ok) return false;
    setTargetUserId(target);
    setTargetLabel(label ?? null);
    return true;
  }, []);

  const stop = useCallback(async () => {
    await fetch('/api/impersonate/stop', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }).catch(() => {});
    setTargetUserId(null);
    setTargetLabel(null);
  }, []);

  return (
    <ImpersonationContext.Provider
      value={{ ready, isAdmin, targetUserId, targetLabel, searchUsers, start, stop }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}
