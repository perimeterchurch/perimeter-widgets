import { describe, it, expect, beforeEach, vi } from 'vitest';
import type * as GetRolesModule from './get-roles';

const { getSession, getRoleIds } = vi.hoisted(() => ({
  getSession: vi.fn(),
  getRoleIds: vi.fn(),
}));

vi.mock('./better-auth', () => ({ auth: { api: { getSession } } }));
vi.mock('./get-roles', async () => {
  // Keep the real error classes — the fallback logic switches on them.
  const actual = await vi.importActual<typeof GetRolesModule>('./get-roles');
  return { ...actual, getRoleIds };
});

import { resolveAccess, requireAdmin } from './access';
import { RolesRejectedError, RolesUnavailableError, TokenUnavailableError } from './get-roles';

const headers = new Headers();

function signedInAs(roles: string | null) {
  getSession.mockResolvedValue({
    session: { id: 'sess-1' },
    user: { id: 'user-1', email: 'dana@perimeter.org', name: 'Dana Barry', roles },
  });
}

beforeEach(() => {
  getSession.mockReset();
  getRoleIds.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('resolveAccess', () => {
  it('is unauthenticated with no session', async () => {
    getSession.mockResolvedValue(null);
    expect(await resolveAccess(headers)).toEqual({ status: 'unauthenticated' });
  });

  it('admits a user whose LIVE roles include 237, without admin', async () => {
    signedInAs('Website Folder - Edit');
    getRoleIds.mockResolvedValue({ userId: 68219, roleIds: [237] });
    expect(await resolveAccess(headers)).toEqual({
      status: 'ok',
      email: 'dana@perimeter.org',
      name: 'Dana Barry',
      isAdmin: false,
      userId: 68219,
      degraded: false,
    });
  });

  it('marks role 2 as admin', async () => {
    signedInAs('Administrators');
    getRoleIds.mockResolvedValue({ userId: 1, roleIds: [2] });
    const access = await resolveAccess(headers);
    expect(access).toMatchObject({ status: 'ok', isAdmin: true });
  });

  // The whole point of the live check: the cookie still says Administrators,
  // MP no longer does, and MP wins.
  it('forbids a user whose role was revoked in MP even though the cookie still claims it', async () => {
    signedInAs('Administrators');
    getRoleIds.mockResolvedValue({ userId: 1, roleIds: [99] });
    expect(await resolveAccess(headers)).toEqual({
      status: 'forbidden',
      email: 'dana@perimeter.org',
    });
  });

  it.each([
    ['a missing MP token', new TokenUnavailableError()],
    ['an MP token upstream rejected', new RolesRejectedError(401)],
  ])('treats %s as unauthenticated, not forbidden', async (_label, error) => {
    signedInAs('Administrators');
    getRoleIds.mockRejectedValue(error);
    expect(await resolveAccess(headers)).toEqual({ status: 'unauthenticated' });
  });

  describe('when perimeter-api is unreachable', () => {
    it('falls back to the signed sign-in claim and marks the decision degraded', async () => {
      signedInAs('Administrators');
      getRoleIds.mockRejectedValue(new RolesUnavailableError('HTTP 503'));
      expect(await resolveAccess(headers)).toEqual({
        status: 'ok',
        email: 'dana@perimeter.org',
        name: 'Dana Barry',
        isAdmin: true,
        userId: null,
        degraded: true,
      });
    });

    it('logs the degradation so the widened revocation window is visible', async () => {
      signedInAs('Administrators');
      getRoleIds.mockRejectedValue(new RolesUnavailableError('HTTP 503'));
      await resolveAccess(headers);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('access.degraded'));
    });

    it('still forbids a user whose claim never admitted them', async () => {
      signedInAs('Basic Reports');
      getRoleIds.mockRejectedValue(new RolesUnavailableError('HTTP 503'));
      expect(await resolveAccess(headers)).toMatchObject({ status: 'forbidden' });
    });

    it('forbids when there is no claim at all (fail closed)', async () => {
      signedInAs(null);
      getRoleIds.mockRejectedValue(new RolesUnavailableError('timeout'));
      expect(await resolveAccess(headers)).toMatchObject({ status: 'forbidden' });
    });
  });
});

describe('requireAdmin', () => {
  it('passes an administrator through with the decision', async () => {
    signedInAs('Administrators');
    getRoleIds.mockResolvedValue({ userId: 1, roleIds: [2] });
    const gate = await requireAdmin(headers);
    expect(gate.ok).toBe(true);
    if (gate.ok) expect(gate.access.email).toBe('dana@perimeter.org');
  });

  it('401s an unauthenticated caller', async () => {
    getSession.mockResolvedValue(null);
    const gate = await requireAdmin(headers);
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.response.status).toBe(401);
  });

  it('403s a studio user who is not an administrator (role 237 only)', async () => {
    signedInAs('Website Folder - Edit');
    getRoleIds.mockResolvedValue({ userId: 1, roleIds: [237] });
    const gate = await requireAdmin(headers);
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.response.status).toBe(403);
  });

  it('403s a caller MP no longer admits at all', async () => {
    signedInAs('Administrators');
    getRoleIds.mockResolvedValue({ userId: 1, roleIds: [] });
    const gate = await requireAdmin(headers);
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.response.status).toBe(403);
  });
});
