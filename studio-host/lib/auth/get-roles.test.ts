import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// `get-roles` reads the MP token through Better Auth; stub that so these tests
// exercise the upstream call, the cache, and the failure-mode split only.
const { getAccessToken } = vi.hoisted(() => ({ getAccessToken: vi.fn() }));
vi.mock('./better-auth', () => ({ auth: { api: { getAccessToken } } }));

import {
  getRoleIds,
  RolesRejectedError,
  RolesUnavailableError,
  TokenUnavailableError,
  _clearCacheForTests,
} from './get-roles';

const session = { session: { id: 'sess-1' }, user: { id: 'user-1' } };
const headers = new Headers();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  _clearCacheForTests();
  getAccessToken.mockReset();
  getAccessToken.mockResolvedValue({ accessToken: 'mp-token' });
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  process.env.PERIMETER_API_URL = 'http://localhost:5500';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getRoleIds', () => {
  it('unwraps the perimeter-api { success, data } envelope', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: true, data: { userId: 68219, roleIds: [2, 99] } }),
    );
    await expect(getRoleIds(session, headers)).resolves.toEqual({
      userId: 68219,
      roleIds: [2, 99],
    });
  });

  it('accepts a bare body too (defensive against spec drift)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ userId: 1, roleIds: [237] }));
    await expect(getRoleIds(session, headers)).resolves.toEqual({ userId: 1, roleIds: [237] });
  });

  it('sends the MP token as a Bearer credential', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ userId: 1, roleIds: [2] }));
    await getRoleIds(session, headers);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer mp-token');
  });

  it('caches within the TTL — a second call makes no upstream request', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ userId: 1, roleIds: [2] }));
    await getRoleIds(session, headers);
    await getRoleIds(session, headers);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caches per session id, not globally', async () => {
    // mockImplementation, not mockResolvedValue: a Response body can only be
    // read once, so a shared instance would fail the second call for the wrong
    // reason.
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ userId: 1, roleIds: [2] })));
    await getRoleIds(session, headers);
    await getRoleIds({ session: { id: 'sess-2' }, user: { id: 'user-2' } }, headers);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('re-fetches once the TTL has elapsed (bounds revocation lag)', async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockImplementation(() =>
        Promise.resolve(jsonResponse({ userId: 1, roleIds: [2] })),
      );
      await getRoleIds(session, headers);
      vi.advanceTimersByTime(61_000);
      await getRoleIds(session, headers);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('throws TokenUnavailableError when the session holds no MP token', async () => {
    getAccessToken.mockResolvedValue({ accessToken: undefined });
    await expect(getRoleIds(session, headers)).rejects.toBeInstanceOf(TokenUnavailableError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws TokenUnavailableError when the token lookup itself fails', async () => {
    getAccessToken.mockRejectedValue(new Error('cookie truncated'));
    await expect(getRoleIds(session, headers)).rejects.toBeInstanceOf(TokenUnavailableError);
  });

  // The failure-mode split is the security-relevant part: 401/403 is upstream
  // telling us the credential is bad (fail closed), anything else is upstream
  // telling us nothing (fall back, don't lock out).
  it.each([401, 403])('treats %i as authoritative rejection', async (status) => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'nope' }, status));
    await expect(getRoleIds(session, headers)).rejects.toBeInstanceOf(RolesRejectedError);
  });

  it.each([500, 502, 503])('treats %i as unavailable, not a verdict', async (status) => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'boom' }, status));
    await expect(getRoleIds(session, headers)).rejects.toBeInstanceOf(RolesUnavailableError);
  });

  it('treats a network failure as unavailable', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(getRoleIds(session, headers)).rejects.toBeInstanceOf(RolesUnavailableError);
  });

  it('treats a malformed body as unavailable rather than as "no roles"', async () => {
    // A body we can't read must never collapse to an empty role list — that
    // would read as a legitimate "this user holds no roles" and lock them out.
    fetchMock.mockResolvedValue(jsonResponse({ success: false, error: 'nope' }));
    await expect(getRoleIds(session, headers)).rejects.toBeInstanceOf(RolesUnavailableError);
  });

  it('does not cache a failure', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 500));
    await expect(getRoleIds(session, headers)).rejects.toBeInstanceOf(RolesUnavailableError);
    fetchMock.mockResolvedValueOnce(jsonResponse({ userId: 1, roleIds: [2] }));
    await expect(getRoleIds(session, headers)).resolves.toEqual({ userId: 1, roleIds: [2] });
  });
});
