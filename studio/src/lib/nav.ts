import type { WidgetEntry } from './discovery';
import { widgetTitle } from './labels';

export interface NavItem {
  to: string;
  label: string;
  /** Renders the sidebar lock indicator — the widget needs an MP sign-in. */
  authRequired?: boolean;
  /**
   * Discovered in the repo but absent from the live CDN manifest, so it has no
   * shipped bundle to embed — its page offers the Dev view only. Local dev only
   * (the deployed sidebar never lists these), and marked in the rail so a
   * missing Embed tab reads as expected rather than broken.
   */
  unreleased?: boolean;
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

/** A released widget as the sidebar needs it: catalog slug + whether it gates on sign-in. */
export interface CatalogNavEntry {
  slug: string;
  authRequired: boolean;
}

/**
 * Pure shaping of discovery output into the sidebar's grouped nav. Keeping it a
 * plain function (no React, no globs, no fetch) makes the Sidebar trivially
 * testable with a fixture and keeps route paths (`/widgets/<slug>`,
 * `/components`, `/guides/<slug>`) defined in exactly one place.
 *
 * ONE `Widgets` group, not the old Catalog + "Widget source (dev)" pair. Those
 * were two views of the same widget on two routes, which meant the same thing
 * appeared twice in the rail; now `/widgets/<slug>` carries both as tabs and the
 * rail lists each widget once. The released set (runtime manifest ∩ definitions,
 * resolved by the caller) is the spine; in local dev, widgets that exist in the
 * repo but are not shipped yet are appended with `unreleased` so the rail says
 * why their page has no Embed tab. While the manifest hasn't resolved
 * (loading/error) `catalog` is empty, so with no dev widgets either the group
 * falls back to the index link and never dead-ends.
 *
 * Components are NOT enumerated here. They used to be one rail entry each, 18
 * of them, which buried the rest of the nav; now a single Reference link points
 * at `/components`, which owns the full list. That page does its own discovery,
 * so this function no longer takes component entries at all.
 */
export function buildNav(
  catalog: CatalogNavEntry[],
  guides: GuideEntry[] = [],
  devWidgets: WidgetEntry[] | null = null,
): NavGroup[] {
  const released = new Set(catalog.map((c) => c.slug));
  const widgetItems: NavItem[] = catalog.map((c) => ({
    to: `/widgets/${c.slug}`,
    label: widgetTitle(c.slug),
    authRequired: c.authRequired,
  }));

  // Dev-only tail: in-repo widgets with no shipped bundle. Sorted among
  // themselves so the order is stable, and kept after the released ones rather
  // than interleaved — the shipped set is what the rail is mostly for.
  if (devWidgets !== null) {
    widgetItems.push(
      ...devWidgets
        .filter((w) => !released.has(w.slug))
        .map((w) => ({
          to: `/widgets/${w.slug}`,
          label: widgetTitle(w.slug),
          unreleased: true,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    );
  }

  return [
    {
      label: 'Widgets',
      items: widgetItems.length > 0 ? widgetItems : [{ to: '/widgets', label: 'All widgets' }],
    },
    {
      label: 'Reference',
      items: [
        // One link to the index rather than an entry per component. The component
        // docs are looked up, not browsed, and the long list crowded out
        // everything else in the sidebar. /components owns the full list.
        { to: '/components', label: 'Components' },
        { to: '/tokens', label: 'Tokens' },
        ...guides.map((g) => ({ to: `/guides/${g.slug}`, label: g.label })),
      ],
    },
  ];
}
