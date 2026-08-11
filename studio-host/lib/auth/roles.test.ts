import { describe, it, expect } from 'vitest';
import { authorizeRoles, ALLOWED_ROLE_NAMES } from './roles';

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
