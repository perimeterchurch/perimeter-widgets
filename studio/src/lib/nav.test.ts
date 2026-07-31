import { describe, it, expect } from 'vitest';
import { buildNav } from './nav';

describe('buildNav', () => {
  it('lists released catalog widgets first, with auth flags and human titles', () => {
    const nav = buildNav([
      { slug: 'my-shepherds', authRequired: true },
      { slug: 'sermons', authRequired: false },
    ]);
    expect(nav[0]).toEqual({
      label: 'Catalog',
      items: [
        { to: '/catalog/my-shepherds', label: 'My Shepherds', authRequired: true },
        { to: '/catalog/sermons', label: 'Sermons', authRequired: false },
      ],
    });
  });

  it('falls back to the single catalog link while the manifest has not loaded', () => {
    const nav = buildNav([]);
    expect(nav[0]).toEqual({
      label: 'Catalog',
      items: [{ to: '/catalog', label: 'Widget catalog' }],
    });
  });

  it('includes the dev source group only when dev widgets are provided', () => {
    const devWidgets = [
      {
        slug: 'example',
        load: () => Promise.reject(new Error('unused in nav shaping')),
        loadCss: () => Promise.reject(new Error('unused in nav shaping')),
      },
    ];
    const withDev = buildNav([], [], devWidgets);
    expect(withDev[1]).toEqual({
      label: 'Widget source (dev)',
      items: [{ to: '/widgets/example', label: 'example' }],
    });
    const withoutDev = buildNav([]);
    expect(withoutDev.map((g) => g.label)).toEqual(['Catalog', 'Reference']);
  });

  it('points Reference at the components index rather than enumerating components', () => {
    // The rail carried one entry per component (18) and buried everything else. One
    // link now; /components owns the list and does its own discovery, which is
    // why buildNav takes no component argument at all.
    const nav = buildNav([], [{ slug: 'styling-widgets', label: 'Styling widgets' }]);
    expect(nav.map((g) => g.label)).toEqual(['Catalog', 'Reference']);
    expect(nav[1]!.items).toEqual([
      { to: '/components', label: 'Components' },
      { to: '/tokens', label: 'Tokens' },
      { to: '/guides/styling-widgets', label: 'Styling widgets' },
    ]);
  });

  it('never emits a per-component rail entry', () => {
    const nav = buildNav([{ slug: 'sermons', authRequired: false }], [], null);
    const everyTo = nav.flatMap((g) => g.items.map((i) => i.to));
    expect(everyTo.filter((to) => to.startsWith('/components'))).toEqual(['/components']);
  });
});
