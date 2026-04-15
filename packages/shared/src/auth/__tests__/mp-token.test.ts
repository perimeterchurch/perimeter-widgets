import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getMPToken } from '../mp-token';

describe('getMPToken', () => {
    const store: Record<string, string> = {};

    beforeEach(() => {
        // Clear store
        for (const key of Object.keys(store)) {
            delete store[key];
        }

        vi.stubGlobal('localStorage', {
            getItem: (key: string) => store[key] ?? null,
            setItem: (key: string, value: string) => {
                store[key] = value;
            },
            removeItem: (key: string) => {
                delete store[key];
            },
            clear: () => {
                for (const key of Object.keys(store)) {
                    delete store[key];
                }
            },
        });
    });

    it('returns authenticated: false when no token', () => {
        expect(getMPToken()).toEqual({ authenticated: false });
    });

    it('returns authenticated: false for null token', () => {
        store['mpp-widgets_AuthToken'] = 'null';
        expect(getMPToken()).toEqual({ authenticated: false });
    });

    it('returns authenticated: false for non-JWT token', () => {
        store['mpp-widgets_AuthToken'] = 'not-a-jwt-token';
        expect(getMPToken()).toEqual({ authenticated: false });
    });

    it('returns authenticated: false for token with wrong segment count', () => {
        store['mpp-widgets_AuthToken'] = 'only.two-segments';
        expect(getMPToken()).toEqual({ authenticated: false });
    });

    it('returns authenticated: false for token with empty segments', () => {
        store['mpp-widgets_AuthToken'] = 'header..signature';
        expect(getMPToken()).toEqual({ authenticated: false });
    });

    it('returns authenticated: true for valid token', () => {
        const token =
            'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
        store['mpp-widgets_AuthToken'] = token;
        expect(getMPToken()).toEqual({ authenticated: true, token });
    });

    it('returns authenticated: false for expired token', () => {
        store['mpp-widgets_AuthToken'] =
            'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
        store['mpp-widgets_ExpiresAfter'] = new Date(
            Date.now() - 60000,
        ).toISOString();
        expect(getMPToken()).toEqual({ authenticated: false });
    });

    it('returns authenticated: true for non-expired token', () => {
        const token =
            'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
        store['mpp-widgets_AuthToken'] = token;
        store['mpp-widgets_ExpiresAfter'] = new Date(
            Date.now() + 3600000,
        ).toISOString();
        expect(getMPToken()).toEqual({ authenticated: true, token });
    });

    it('returns expiringSoon: true when token expires within 5 minutes', () => {
        const token =
            'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
        store['mpp-widgets_AuthToken'] = token;
        store['mpp-widgets_ExpiresAfter'] = new Date(
            Date.now() + 2 * 60 * 1000,
        ).toISOString(); // 2 minutes from now
        expect(getMPToken()).toEqual({
            authenticated: true,
            token,
            expiringSoon: true,
        });
    });

    it('does not return expiringSoon when token expires in more than 5 minutes', () => {
        const token =
            'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
        store['mpp-widgets_AuthToken'] = token;
        store['mpp-widgets_ExpiresAfter'] = new Date(
            Date.now() + 30 * 60 * 1000,
        ).toISOString(); // 30 minutes from now
        expect(getMPToken()).toEqual({ authenticated: true, token });
    });
});
