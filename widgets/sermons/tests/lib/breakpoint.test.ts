// widgets/sermons/tests/lib/breakpoint.test.ts
import { describe, it, expect } from 'vitest';
import { bucketFor } from '../../src/lib/breakpoint';

describe('bucketFor', () => {
  it('phone below 480px (30rem)', () => {
    expect(bucketFor(343)).toBe('phone');
    expect(bucketFor(479)).toBe('phone');
  });
  it('tablet in [480, 768)', () => {
    expect(bucketFor(480)).toBe('tablet');
    expect(bucketFor(702)).toBe('tablet');
    expect(bucketFor(767)).toBe('tablet');
  });
  it('desktop at >= 768px (48rem)', () => {
    expect(bucketFor(768)).toBe('desktop');
    expect(bucketFor(1100)).toBe('desktop');
  });
});
