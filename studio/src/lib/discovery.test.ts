// studio/src/lib/discovery.test.ts
import { describe, it, expect } from 'vitest';
import {
  toWidgetEntries,
  toComponentEntries,
  widgetDefGlob,
  widgetCssGlob,
  componentGlob,
} from './discovery';

describe('discovery normalizers', () => {
  it('derives a widget slug from its path', () => {
    const entries = toWidgetEntries({
      '/widgets/sermons/src/widget.tsx': () => Promise.resolve({ default: { name: 'sermons' } }),
      '/widgets/example/src/widget.tsx': () => Promise.resolve({ default: { name: 'example' } }),
    } as unknown as Parameters<typeof toWidgetEntries>[0]);
    expect(entries.map((e) => e.slug).sort()).toEqual(['example', 'sermons']);
  });
  it('derives a component name from its filename', () => {
    const entries = toComponentEntries({
      '/packages/ui/src/button.tsx': () => Promise.resolve({}),
      '/packages/ui/src/card.tsx': () => Promise.resolve({}),
    });
    expect(entries.map((e) => e.name).sort()).toEqual(['button', 'card']);
  });
});

describe('live import.meta.glob discovery (regression guard for glob base path)', () => {
  // These run the real globs through Vite/Vitest. If the glob base is wrong
  // (e.g. `/widgets/...` resolving against the studio root) the maps are EMPTY —
  // which is exactly the "no widgets/components listed" bug. typecheck/build do
  // NOT catch that, so assert the globs actually match files.
  it('discovers at least the sermons + example widgets', () => {
    const slugs = toWidgetEntries(widgetDefGlob).map((e) => e.slug);
    expect(slugs).toContain('sermons');
    expect(slugs).toContain('example');
  });
  it('discovers UI components', () => {
    const names = toComponentEntries(componentGlob).map((e) => e.name);
    expect(names).toContain('button');
    expect(names.length).toBeGreaterThan(5);
  });

  it('widget css entries resolve to { default: <string> } (not a bare string)', async () => {
    // Guards against `import: 'default'` on the css glob, which makes the importer
    // resolve to the raw string so `.default` is undefined → mount() crashes on
    // rewriteRootToHost(undefined). The css string itself may be empty; only its shape matters.
    const entries = toWidgetEntries(widgetDefGlob, widgetCssGlob);
    const example = entries.find((e) => e.slug === 'example');
    expect(example).toBeDefined();
    const mod = await example!.loadCss();
    expect(typeof mod.default).toBe('string');
  });
});
