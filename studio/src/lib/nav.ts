import type { WidgetEntry, ComponentEntry } from './discovery';
import { titleFromSlug } from './labels';

export interface NavItem {
  to: string;
  label: string;
  /** Renders the sidebar lock indicator — the widget needs an MP sign-in. */
  authRequired?: boolean;
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
 * testable with a fixture and keeps route paths (`/catalog/<slug>`,
 * `/widgets/<slug>`, `/components/<name>`, `/guides/<slug>`) defined in exactly
 * one place.
 *
 * The Catalog group is the canonical widget list — released widgets (runtime
 * manifest ∩ definitions, resolved by the caller) linking to their catalog
 * viewer pages, with an auth flag for the lock indicator. While the manifest
 * hasn't resolved (loading/error) `catalog` is empty and the group falls back
 * to the single landing link, so the sidebar never dead-ends.
 *
 * The source-preview pages (`/widgets/<slug>`) stay routable everywhere but
 * only get a nav group in local dev (`devWidgets` non-null) — on the deployed
 * site the catalog is the one widget list staff see.
 */
export function buildNav(
  catalog: CatalogNavEntry[],
  components: ComponentEntry[],
  guides: GuideEntry[] = [],
  devWidgets: WidgetEntry[] | null = null,
): NavGroup[] {
  const catalogItems: NavItem[] =
    catalog.length > 0
      ? catalog.map((c) => ({
          to: `/catalog/${c.slug}`,
          label: titleFromSlug(c.slug),
          authRequired: c.authRequired,
        }))
      : [{ to: '/catalog', label: 'Widget catalog' }];

  return [
    { label: 'Catalog', items: catalogItems },
    ...(devWidgets !== null
      ? [
          {
            label: 'Widget source (dev)',
            items: devWidgets.map((w) => ({ to: `/widgets/${w.slug}`, label: w.slug })),
          },
        ]
      : []),
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
