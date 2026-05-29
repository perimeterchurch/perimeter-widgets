import { describe, it, expect } from 'vitest';
import { corsHeaders } from '@/lib/cors';

describe('corsHeaders', () => {
  it('returns a Next.js headers() entry that allows any origin for all paths', async () => {
    const entries = await corsHeaders();
    expect(entries).toEqual([
      {
        source: '/(.*)',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ]);
  });
});
