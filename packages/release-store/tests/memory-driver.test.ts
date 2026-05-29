import { describe, it, expect } from 'vitest';
import { createMemoryKv, createMemoryBlob } from '../src/drivers/memory';

describe('memory kv', () => {
  it('round-trips values and returns null for missing keys', async () => {
    const kv = createMemoryKv();
    expect(await kv.get('missing')).toBeNull();
    await kv.set('k', { a: 1 });
    expect(await kv.get<{ a: number }>('k')).toEqual({ a: 1 });
  });
});

describe('memory blob', () => {
  it('stores, reports existence, and reads back as a stream', async () => {
    const blob = createMemoryBlob();
    expect(await blob.exists('p/1/index.js')).toBe(false);
    await blob.put('p/1/index.js', Buffer.from('hello'), 'application/javascript');
    expect(await blob.exists('p/1/index.js')).toBe(true);
    const stream = await blob.get('p/1/index.js');
    expect(stream).not.toBeNull();
    const text = await new Response(stream).text();
    expect(text).toBe('hello');
  });

  it('returns null reading a missing blob', async () => {
    const blob = createMemoryBlob();
    expect(await blob.get('nope')).toBeNull();
  });
});
