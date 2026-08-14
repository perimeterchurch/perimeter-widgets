// @vitest-environment happy-dom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { AccountMenu } from './AccountMenu';

const TOKEN_KEY = 'mpp-widgets_AuthToken';
const EXP_KEY = 'mpp-widgets_ExpiresAfter';

/** Capture navigation instead of performing it. */
let navigatedTo: string | null;

beforeEach(() => {
  navigatedTo = null;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      get href() {
        return 'https://style.perimeter.org/';
      },
      set href(value: string) {
        navigatedTo = value;
      },
    },
  });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

/** The shell answers the session probe, so the sign-out control renders. */
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// `url: string` (not RequestInfo) because every call site here passes a string —
// it keeps the assertions below comparing strings rather than stringifying
// objects.
function stubFetch(logout: { body?: unknown; reject?: boolean } = {}) {
  const fetchMock = vi.fn((url: string): Promise<Response> => {
    if (url.includes('/api/auth/get-session')) {
      return Promise.resolve(json({ user: { email: 'dana@perimeter.org' } }));
    }
    if (url.includes('/api/auth/logout')) {
      return logout.reject
        ? Promise.reject(new Error('network down'))
        : Promise.resolve(json(logout.body ?? { redirectTo: '/sign-in' }));
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function seedBridgedToken() {
  window.localStorage.setItem(TOKEN_KEY, 'mp-access-token');
  window.localStorage.setItem(EXP_KEY, new Date(Date.now() + 3_600_000).toISOString());
}

async function clickSignOut() {
  const { findByRole } = render(<AccountMenu />);
  const button = await findByRole('button', { name: /sign out/i });
  button.click();
  return button;
}

describe('AccountMenu sign-out', () => {
  it('clears the bridged MP token from localStorage', async () => {
    stubFetch({ body: { redirectTo: 'https://mp.example/endsession' } });
    seedBridgedToken();
    await clickSignOut();
    await waitFor(() => {
      expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(window.localStorage.getItem(EXP_KEY)).toBeNull();
    });
  });

  it('follows the MP end-session URL the server returns', async () => {
    stubFetch({ body: { redirectTo: 'https://mp.example/endsession?id_token_hint=abc' } });
    await clickSignOut();
    await waitFor(() => {
      expect(navigatedTo).toBe('https://mp.example/endsession?id_token_hint=abc');
    });
  });

  it('calls the logout route, not the bare Better Auth sign-out', async () => {
    const fetchMock = stubFetch();
    await clickSignOut();
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => c[0]);
      expect(urls).toContain('/api/auth/logout');
      expect(urls.some((u) => u.includes('/api/auth/sign-out'))).toBe(false);
    });
  });

  // The token must go even if the round-trip doesn't: leaving a live MP token in
  // localStorage is the failure most easily mistaken for "still signed in".
  it('still clears the token and lands on /sign-in when the request fails', async () => {
    stubFetch({ reject: true });
    seedBridgedToken();
    await clickSignOut();
    await waitFor(() => {
      expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(navigatedTo).toBe('/sign-in');
    });
  });

  it('falls back to /sign-in when the response carries no redirect', async () => {
    stubFetch({ body: {} });
    await clickSignOut();
    await waitFor(() => expect(navigatedTo).toBe('/sign-in'));
  });

  it('renders nothing without an auth shell session', async () => {
    // No auth shell: the dev server answers the probe with the SPA's index.html.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('<!doctype html>', { status: 200 }))),
    );
    const { container } = render(<AccountMenu />);
    await waitFor(() => expect(container.querySelector('button')).toBeNull());
  });
});
