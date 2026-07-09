import type { WidgetEntry, ComponentEntry } from './discovery';

export interface NavItem {
  to: string;
  label: string;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** A discovered guide (Chunk 3 / Task 12 wires up real discovery; default []). */
export interface GuideEntry {
  slug: string;
  label: string;
}

/**
 * Pure shaping of discovery output into the sidebar's grouped nav. Keeping it a
 * plain function (no React, no globs) makes the Sidebar trivially testable with a
 * fixture and keeps route paths (`/widgets/<slug>`, `/components/<name>`,
 * `/guides/<slug>`) defined in exactly one place.
 */
export function buildNav(
  widgets: WidgetEntry[],
  components: ComponentEntry[],
  guides: GuideEntry[] = [],
): NavGroup[] {
  return [
    {
      label: 'Catalog',
      items: [{ to: '/catalog', label: 'Widget catalog' }],
    },
    {
      label: 'Widgets',
      items: widgets.map((w) => ({ to: `/widgets/${w.slug}`, label: w.slug })),
    },
    {
      label: 'Components',
      items: components.map((c) => ({ to: `/components/${c.name}`, label: c.name })),
    },
    {
      label: 'Reference',
      items: [
        { to: '/tokens', label: 'Tokens' },
        ...guides.map((g) => ({ to: `/guides/${g.slug}`, label: g.label })),
      ],
    },
  ];
}
