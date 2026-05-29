// studio/src/lib/discovery.test.ts
import { describe, it, expect } from 'vitest';
import { toWidgetEntries, toComponentEntries } from './discovery';

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
