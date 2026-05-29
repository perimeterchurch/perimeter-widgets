// studio/src/lib/discovery.test.ts
import { describe, it, expect } from 'vitest';
import { toWidgetEntries, toComponentEntries } from './discovery';

describe('discovery normalizers', () => {
  it('derives a widget slug from its path', () => {
    const entries = toWidgetEntries({
      '/widgets/sermons/src/widget.tsx': async () => ({ default: { name: 'sermons' } }),
      '/widgets/example/src/widget.tsx': async () => ({ default: { name: 'example' } }),
    });
    expect(entries.map((e) => e.slug).sort()).toEqual(['example', 'sermons']);
  });
  it('derives a component name from its filename', () => {
    const entries = toComponentEntries({
      '/packages/ui/src/button.tsx': async () => ({}),
      '/packages/ui/src/card.tsx': async () => ({}),
    });
    expect(entries.map((e) => e.name).sort()).toEqual(['button', 'card']);
  });
});
