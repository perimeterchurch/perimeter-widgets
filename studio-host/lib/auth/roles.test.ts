import { describe, it, expect } from 'vitest';
import {
  authorizeRoles,
  authorizeRoleIds,
  isAdministratorRoleIds,
  ALLOWED_ROLE_NAMES,
  ALLOWED_ROLE_IDS,
  ADMIN_ROLE_ID,
} from './roles';

describe('authorizeRoles', () => {
  it('allows Administrators (MP role 2)', () => {
    const d = authorizeRoles(['Administrators', 'Basic Reports', 'Live Chat']);
    expect(d.allowed).toBe(true);
    expect(d.matched).toEqual(['Administrators']);
  });

  it('allows Website Folder - Edit (MP role 237)', () => {
    expect(authorizeRoles(['Website Folder - Edit']).allowed).toBe(true);
  });

  it('matched lists every allowed role held', () => {
    expect(authorizeRoles(['Administrators', 'Website Folder - Edit']).matched).toEqual([
      ...ALLOWED_ROLE_NAMES,
    ]);
  });

  it('denies a user with only non-allowed roles', () => {
    expect(authorizeRoles(['Basic Reports', 'Live Chat']).allowed).toBe(false);
  });

  it('denies empty / missing / non-array claims (fail closed)', () => {
    for (const claim of [[], undefined, null, 42, {}]) {
      expect(authorizeRoles(claim).allowed).toBe(false);
    }
  });

  it('tolerates comma/semicolon-delimited string claims', () => {
    expect(authorizeRoles('Administrators,Basic Reports').allowed).toBe(true);
    expect(authorizeRoles('Live Chat;Basic Reports').allowed).toBe(false);
  });

  it('preserves multi-word role names (no whitespace split)', () => {
    expect(authorizeRoles('Website Folder - Edit').allowed).toBe(true);
  });

  it('ignores non-string entries in an array claim', () => {
    expect(authorizeRoles(['Administrators', 123, null]).allowed).toBe(true);
  });
});

describe('authorizeRoleIds (the per-request gate)', () => {
  it('admits Administrators (2) and Website Folder - Edit (237)', () => {
    expect(authorizeRoleIds([2])).toBe(true);
    expect(authorizeRoleIds([237])).toBe(true);
    expect(authorizeRoleIds([99, 237, 100])).toBe(true);
  });

  it('denies a user holding only other roles, and an empty set (fail closed)', () => {
    expect(authorizeRoleIds([99, 100])).toBe(false);
    expect(authorizeRoleIds([])).toBe(false);
  });

  it('gates on the same two roles as the name-based sign-in check', () => {
    // The two lists must not drift: whoever the claim admits at sign-in is
    // whoever the ID check admits afterwards.
    expect(ALLOWED_ROLE_IDS).toHaveLength(ALLOWED_ROLE_NAMES.length);
  });
});

describe('isAdministratorRoleIds (impersonation gate)', () => {
  it('requires role 2 specifically — 237 is not enough', () => {
    expect(isAdministratorRoleIds([ADMIN_ROLE_ID])).toBe(true);
    expect(isAdministratorRoleIds([237])).toBe(false);
    expect(isAdministratorRoleIds([])).toBe(false);
  });

  it('is narrower than studio access', () => {
    // 237 gets into the studio but must not reach impersonation.
    expect(authorizeRoleIds([237])).toBe(true);
    expect(isAdministratorRoleIds([237])).toBe(false);
  });
});
