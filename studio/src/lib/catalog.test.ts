// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { joinCatalog } from './catalog';

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
