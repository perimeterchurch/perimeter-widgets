import { describe, it, expect } from 'vitest';
import { buildNav } from './nav';

/** A discovered-but-not-necessarily-released widget, as discovery hands it over. */
const devWidget = (slug: string) => ({
  slug,
  load: () => Promise.reject(new Error('unused in nav shaping')),
  loadCss: () => Promise.reject(new Error('unused in nav shaping')),
});

describe('buildNav', () => {
  it('lists released widgets in one Widgets group, with auth flags and human titles', () => {
    const nav = buildNav([
      { slug: 'my-shepherds', authRequired: true },
      { slug: 'sermons', authRequired: false },
    ]);
    expect(nav[0]).toEqual({
      label: 'Widgets',
      items: [
        { to: '/widgets/my-shepherds', label: 'My Shepherds', authRequired: true },
        { to: '/widgets/sermons', label: 'Sermons', authRequired: false },
      ],
    });
  });

  it('has no separate Catalog or source group — one entry per widget', () => {
    // The whole point of the merge: /catalog/<slug> and /widgets/<slug> were two
    // views of one widget, so the rail listed everything twice.
    const nav = buildNav([{ slug: 'sermons', authRequired: false }], [], [devWidget('sermons')]);
    expect(nav.map((g) => g.label)).toEqual(['Widgets', 'Reference']);
    expect(nav[0]!.items).toEqual([
      { to: '/widgets/sermons', label: 'Sermons', authRequired: false },
    ]);
    expect(nav.flatMap((g) => g.items).filter((i) => i.to.includes('sermons'))).toHaveLength(1);
    expect(nav.flatMap((g) => g.items).some((i) => i.to.startsWith('/catalog'))).toBe(false);
  });

  it('appends unreleased dev widgets after the released ones, marked', () => {
    const nav = buildNav(
      [{ slug: 'sermons', authRequired: false }],
      [],
      [devWidget('sermons'), devWidget('event-finder'), devWidget('example')],
    );
    expect(nav[0]!.items).toEqual([
      { to: '/widgets/sermons', label: 'Sermons', authRequired: false },
      { to: '/widgets/event-finder', label: 'Event Finder', unreleased: true },
      { to: '/widgets/example', label: 'Example', unreleased: true },
    ]);
  });

  it('omits unreleased widgets entirely when dev widgets are not provided', () => {
    // The deployed sidebar: released set only, so in-progress work stays private.
    const nav = buildNav([{ slug: 'sermons', authRequired: false }]);
    expect(nav[0]!.items).toEqual([
      { to: '/widgets/sermons', label: 'Sermons', authRequired: false },
    ]);
  });

  it('falls back to the index link while the manifest has not loaded', () => {
    const nav = buildNav([]);
    expect(nav[0]).toEqual({
      label: 'Widgets',
      items: [{ to: '/widgets', label: 'All widgets' }],
    });
  });

  it('still lists dev widgets when the manifest has not loaded', () => {
    // A manifest fetch failure must not empty the rail for a developer.
    const nav = buildNav([], [], [devWidget('example')]);
    expect(nav[0]!.items).toEqual([{ to: '/widgets/example', label: 'Example', unreleased: true }]);
  });

  it('points Reference at the components index rather than enumerating components', () => {
    const nav = buildNav([], [{ slug: 'styling-widgets', label: 'Styling widgets' }]);
    expect(nav.map((g) => g.label)).toEqual(['Widgets', 'Reference']);
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
