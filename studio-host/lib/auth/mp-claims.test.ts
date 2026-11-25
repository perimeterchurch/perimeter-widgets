import { describe, it, expect } from 'vitest';
import { emailVerifiedClaim, imageClaim } from './mp-claims';

describe('emailVerifiedClaim', () => {
  it.each([
    [true, true],
    ['true', true],
    ['True', true],
    [false, false],
    ['false', false],
    [undefined, false],
    [1, false],
  ])('%j → %s', (claim, expected) => {
    expect(emailVerifiedClaim(claim)).toBe(expected);
  });
});

describe('imageClaim', () => {
  it('keeps a string picture and drops anything else', () => {
    expect(imageClaim('https://x/y.png')).toBe('https://x/y.png');
    expect(imageClaim('')).toBeUndefined();
    expect(imageClaim(42)).toBeUndefined();
    expect(imageClaim(undefined)).toBeUndefined();
  });
});
