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

    it('returns authenticated: false for short token', () => {
        store['mpp-widgets_AuthToken'] = 'short';
        expect(getMPToken()).toEqual({ authenticated: false });
    });

    it('returns authenticated: true for valid token', () => {
        const token = 'a-valid-access-token-that-is-long-enough';
        store['mpp-widgets_AuthToken'] = token;
        expect(getMPToken()).toEqual({ authenticated: true, token });
    });

    it('returns authenticated: false for expired token', () => {
        store['mpp-widgets_AuthToken'] =
            'a-valid-access-token-that-is-long-enough';
        store['mpp-widgets_ExpiresAfter'] = new Date(
            Date.now() - 60000,
        ).toISOString();
        expect(getMPToken()).toEqual({ authenticated: false });
    });

    it('returns authenticated: true for non-expired token', () => {
        const token = 'a-valid-access-token-that-is-long-enough';
        store['mpp-widgets_AuthToken'] = token;
        store['mpp-widgets_ExpiresAfter'] = new Date(
            Date.now() + 3600000,
        ).toISOString();
        expect(getMPToken()).toEqual({ authenticated: true, token });
    });
});
