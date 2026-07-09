import type { WidgetDefinition } from '@perimeter/widget-runtime';

/** Single source of truth for the CDN origin — tests and any future staging host override here. */
export const CDN_BASE_URL = 'https://widgets.perimeter.org';

export interface CatalogEntry {
  slug: string;
  version: string;
  /** Absent when the manifest lists a widget the repo no longer has (stale entry). */
  definition?: WidgetDefinition;
  /** From `description:` frontmatter in docs/widgets/<slug>.mdx; absent when none. */
  description?: string;
}

export interface LoadedWidgetMeta {
  definition: WidgetDefinition;
  description?: string | undefined;
}

/**
 * Pure join of the CDN manifest with the repo's loaded widget metadata: only
 * released widgets appear, `example` (internal reference widget) is hidden, and
 * a manifest entry with no repo definition still shows up (reduced card).
 */
export function joinCatalog(
  manifest: Record<string, string>,
  loaded: Map<string, LoadedWidgetMeta>,
): CatalogEntry[] {
  return Object.entries(manifest)
    .filter(([slug]) => slug !== 'example')
    .map(([slug, version]): CatalogEntry => {
      const meta = loaded.get(slug);
      if (!meta) return { slug, version };
      const entry: CatalogEntry = { slug, version, definition: meta.definition };
      if (meta.description !== undefined) entry.description = meta.description;
      return entry;
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
