import { describe, it, expect } from 'vitest';
import { serializeQuery } from '../../src/internal/serialize-query';

describe('serializeQuery', () => {
  it('returns empty string for empty input', () => {
    expect(serializeQuery({})).toBe('');
  });
  it('skips undefined and null values', () => {
    expect(serializeQuery({ a: undefined, b: null, c: 'keep' })).toBe('c=keep');
  });
  it('coerces numbers and booleans to strings', () => {
    expect(serializeQuery({ page: 3, active: true, ratio: 0.5 })).toBe(
      'page=3&active=true&ratio=0.5',
    );
  });
  it('encodes arrays as repeated keys', () => {
    expect(serializeQuery({ speakerId: [1, 2, 3] })).toBe('speakerId=1&speakerId=2&speakerId=3');
  });
  it('encodes Date as YYYY-MM-DD', () => {
    const d = new Date('2026-03-15T12:34:56Z');
    expect(serializeQuery({ from: d })).toBe('from=2026-03-15');
  });
  it('url-encodes values with special characters', () => {
    expect(serializeQuery({ q: 'a & b' })).toBe('q=a%20%26%20b');
  });
  it('preserves insertion order of keys', () => {
    expect(serializeQuery({ z: '1', a: '2' })).toBe('z=1&a=2');
  });
  it('drops empty arrays', () => {
    expect(serializeQuery({ tags: [] as string[], keep: 'yes' })).toBe('keep=yes');
  });
});
