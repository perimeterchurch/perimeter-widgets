import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    type ReactNode,
} from 'react';

// localStorage keys used by WordPress's MP OAuth integration
const TOKEN_KEY = 'mpp-widgets_AuthToken';
const EXPIRY_KEY = 'mpp-widgets_ExpiresAfter';

export interface MPAuthState {
    authenticated: boolean;
    token?: string;
    expiringSoon?: boolean;
}

/**
 * Checks if a string has JWT-like structure (three dot-separated non-empty segments).
 * Does not decode or verify — that's the API's responsibility.
 */
function isJwtLike(value: string): boolean {
    const parts = value.split('.');
    return parts.length === 3 && parts.every((p) => p.length > 0);
}

/**
 * Reads the MP OAuth token from localStorage.
 * Returns { authenticated: true, token } if valid, { authenticated: false } otherwise.
 */
export function getMPToken(): MPAuthState {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        const expiresAfter = localStorage.getItem(EXPIRY_KEY);

        if (!token || token === 'null' || !isJwtLike(token)) {
            return { authenticated: false };
        }

        if (expiresAfter) {
            const expiresAt = new Date(expiresAfter);
            if (expiresAt < new Date()) {
                return { authenticated: false };
            }
            const fiveMinutes = 5 * 60 * 1000;
            if (expiresAt.getTime() - Date.now() < fiveMinutes) {
                return { authenticated: true, token, expiringSoon: true };
            }
        }

        return { authenticated: true, token };
    } catch {
        // localStorage may not be available (SSR, iframe restrictions)
        return { authenticated: false };
    }
}

interface AuthContextValue extends MPAuthState {
    refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
    requiresAuth,
    children,
}: {
    requiresAuth: boolean;
    children: ReactNode;
}) {
    const [authState, setAuthState] = useState<MPAuthState>(() =>
        requiresAuth ? getMPToken() : { authenticated: false },
    );

    const refresh = useCallback(() => {
        if (requiresAuth) {
            setAuthState(getMPToken());
        }
    }, [requiresAuth]);

    // Listen for storage events (token changes from other tabs)
    useEffect(() => {
        if (!requiresAuth) return;

        const handleStorage = (e: StorageEvent) => {
            if (
                (e.key === TOKEN_KEY || e.key === EXPIRY_KEY)
                && e.newValue !== e.oldValue
            ) {
                refresh();
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [requiresAuth, refresh]);

    // Periodically re-read token to detect expiry or silent renewal
    useEffect(() => {
        if (!requiresAuth || !authState.authenticated) return;
        const interval = setInterval(refresh, 60_000);
        return () => clearInterval(interval);
    }, [requiresAuth, authState.authenticated, refresh]);

    const contextValue = useMemo(
        () => ({ ...authState, refresh }),
        [authState, refresh],
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return ctx;
}
