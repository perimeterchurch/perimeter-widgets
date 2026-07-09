// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { z } from 'zod';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { joinCatalog, useCatalog } from './catalog';

function def(name: string, auth: 'required' | 'optional' | 'none' = 'none'): WidgetDefinition {
  return { name, auth, schema: z.object({}), App: () => null };
}

describe('joinCatalog', () => {
  it('joins manifest entries with loaded definitions, sorted by slug', () => {
    const entries = joinCatalog(
      { sermons: '1.4.2', 'my-shepherds': '0.1.0' },
      new Map([
        ['sermons', { definition: def('sermons'), description: 'Browse sermons.' }],
        ['my-shepherds', { definition: def('my-shepherds', 'required'), description: undefined }],
      ]),
    );
    expect(entries.map((e) => e.slug)).toEqual(['my-shepherds', 'sermons']);
    expect(entries[1]).toMatchObject({ slug: 'sermons', version: '1.4.2' });
    expect(entries[1]!.definition?.auth).toBe('none');
    expect(entries[1]!.description).toBe('Browse sermons.');
  });

  it('excludes the example widget', () => {
    const entries = joinCatalog({ example: '0.0.1', sermons: '1.4.2' }, new Map());
    expect(entries.map((e) => e.slug)).toEqual(['sermons']);
  });

  it('keeps stale manifest entries (no repo definition) without a definition', () => {
    const entries = joinCatalog({ ghost: '2.0.0' }, new Map());
    expect(entries).toEqual([{ slug: 'ghost', version: '2.0.0' }]);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubManifest(body: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      json: () => Promise.resolve(body),
    }),
  );
}

describe('useCatalog', () => {
  it('loads released widgets with definitions from real discovery', async () => {
    // my-shepherds exists in the repo; `ghost` is a stale manifest entry.
    stubManifest({ 'my-shepherds': '0.1.0', ghost: '9.9.9', example: '0.0.1' });
    const { result } = renderHook(() => useCatalog());
    expect(result.current.isLoading).toBe(true);
    // First real widget-module import goes through vitest's transform pipeline;
    // under a fully parallel workspace run that can exceed the 1s default.
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 10_000 });
    expect(result.current.error).toBeNull();
    const slugs = result.current.entries.map((e) => e.slug);
    expect(slugs).toEqual(['ghost', 'my-shepherds']); // example filtered, sorted
    expect(result.current.entries[1]!.definition?.auth).toBe('required');
    expect(result.current.entries[0]!.definition).toBeUndefined();
  });

  it('surfaces a fetch failure as error and retry re-fetches', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', failing);
    const { result } = renderHook(() => useCatalog());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    stubManifest({ 'my-shepherds': '0.1.0' });
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.error).toBeNull());
    // error clears synchronously on retry, but entries fill only after the
    // async fetch/definition chain settles — wait for them too (deflake).
    await waitFor(() =>
      expect(result.current.entries.map((e) => e.slug)).toEqual(['my-shepherds']),
    );
  });

  it('treats a non-ok response as an error', async () => {
    stubManifest({}, /* ok */ false);
    const { result } = renderHook(() => useCatalog());
    await waitFor(() => expect(result.current.error).not.toBeNull());
  });
});
