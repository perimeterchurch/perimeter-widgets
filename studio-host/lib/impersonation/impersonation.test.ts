import { describe, it, expect } from 'vitest';
import { isAdministrator } from './admin';
import { isAllowedProxyPath } from './config';
import { signTarget, readTarget } from './cookie';

process.env.BETTER_AUTH_SECRET ||= 'test-secret-for-impersonation-cookies';

describe('isAdministrator', () => {
  it('allows a session whose roles include Administrators', () => {
    expect(isAdministrator('Administrators')).toBe(true);
    expect(isAdministrator('Administrators,Website Folder - Edit')).toBe(true);
    expect(isAdministrator('Website Folder - Edit, Administrators')).toBe(true);
  });
  it('denies Website-Folder-only, empty, and missing roles', () => {
    expect(isAdministrator('Website Folder - Edit')).toBe(false);
    expect(isAdministrator('')).toBe(false);
    expect(isAdministrator(null)).toBe(false);
    expect(isAdministrator(undefined)).toBe(false);
  });
});

describe('isAllowedProxyPath', () => {
  it('allows only the whitelisted read endpoints (verbatim widget paths)', () => {
    expect(isAllowedProxyPath('api/giving/history')).toBe(true);
    expect(isAllowedProxyPath('api/shepherds')).toBe(true);
  });
  it('rejects anything else (least privilege)', () => {
    expect(isAllowedProxyPath('api/contacts')).toBe(false);
    expect(isAllowedProxyPath('api/giving/history/../contacts')).toBe(false);
    expect(isAllowedProxyPath('api/shepherds/write')).toBe(false);
    expect(isAllowedProxyPath('giving/history')).toBe(false); // missing /api prefix
    expect(isAllowedProxyPath('')).toBe(false);
  });
});

describe('impersonation cookie sign/verify', () => {
  it('round-trips a valid target', () => {
    expect(readTarget(signTarget(68219))).toBe(68219);
  });
  it('rejects a tampered signature', () => {
    const signed = signTarget(68219);
    expect(readTarget(signed.slice(0, -1) + 'X')).toBeNull();
  });
  it('rejects a tampered payload (cannot swap the target)', () => {
    const sig = signTarget(68219).split('.')[1];
    expect(readTarget(`99999.${sig}`)).toBeNull();
  });
  it('rejects missing / malformed / non-positive values', () => {
    expect(readTarget(null)).toBeNull();
    expect(readTarget('')).toBeNull();
    expect(readTarget('68219')).toBeNull(); // no signature
    expect(readTarget(signTarget(0))).toBeNull();
  });
});
