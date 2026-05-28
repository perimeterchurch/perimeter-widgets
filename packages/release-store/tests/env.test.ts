import { describe, it, expect } from 'vitest';
import { resolveKvConfig } from '../src/drivers/env';

describe('resolveKvConfig', () => {
  it('detects Vercel KV REST vars', () => {
    expect(
      resolveKvConfig({ KV_REST_API_URL: 'https://x', KV_REST_API_TOKEN: 't' }),
    ).toEqual({ kind: 'vercel-kv', url: 'https://x', token: 't' });
  });

  it('throws a clear, actionable error when no recognized vars are present', () => {
    expect(() => resolveKvConfig({})).toThrow(/KV_REST_API_URL|REDIS_URL/);
  });

  it('throws when a REDIS_URL-only store is present (adapter not wired yet)', () => {
    // The Vercel/Upstash marketplace store usually also exposes KV_REST_API_*;
    // if only REDIS_URL exists we fail loudly rather than guess.
    expect(() => resolveKvConfig({ REDIS_URL: 'redis://x' })).toThrow(/REDIS_URL/);
  });
});
