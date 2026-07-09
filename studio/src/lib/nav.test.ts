import { describe, it, expect } from 'vitest';
import { buildNav } from './nav';

describe('buildNav', () => {
  it('lists released catalog widgets first, with auth flags and human titles', () => {
    const nav = buildNav(
      [
        { slug: 'my-shepherds', authRequired: true },
        { slug: 'sermons', authRequired: false },
      ],
      [],
    );
    expect(nav[0]).toEqual({
      label: 'Catalog',
      items: [
        { to: '/catalog/my-shepherds', label: 'My Shepherds', authRequired: true },
        { to: '/catalog/sermons', label: 'Sermons', authRequired: false },
      ],
    });
  });

  it('falls back to the single catalog link while the manifest has not loaded', () => {
    const nav = buildNav([], []);
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
    const withDev = buildNav([], [], [], devWidgets);
    expect(withDev[1]).toEqual({
      label: 'Widget source (dev)',
      items: [{ to: '/widgets/example', label: 'example' }],
    });
    const withoutDev = buildNav([], []);
    expect(withoutDev.map((g) => g.label)).toEqual(['Catalog', 'Components', 'Reference']);
  });

  it('keeps the Components and Reference groups', () => {
    const nav = buildNav(
      [],
      [{ name: 'button', load: () => Promise.resolve({}) }],
      [{ slug: 'styling-widgets', label: 'Styling widgets' }],
    );
    expect(nav.map((g) => g.label)).toEqual(['Catalog', 'Components', 'Reference']);
    expect(nav[1]!.items).toEqual([{ to: '/components/button', label: 'button' }]);
    expect(nav[2]!.items).toEqual([
      { to: '/tokens', label: 'Tokens' },
      { to: '/guides/styling-widgets', label: 'Styling widgets' },
    ]);
  });
});
