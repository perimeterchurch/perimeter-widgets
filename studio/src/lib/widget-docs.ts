import type { ComponentType } from 'react';

interface DocModule {
  default: ComponentType;
  /** Exposed by remark-mdx-frontmatter; absent for docs without frontmatter. */
  frontmatter?: { description?: string };
}
type DocLoader = () => Promise<DocModule>;

// Optional per-widget MDX docs, single-sourced under `docs/widgets/<slug>.mdx`. The
// glob is LAZY (eager:false) so each doc is a separate async chunk — WidgetPage
// Suspends on the one it needs. Pattern is relative to THIS file (studio/src/lib/):
// `../../../` reaches repo root. Never `/…`, which Vite resolves against the studio
// project root and matches nothing (the same trap discovery.ts documents).
// Only `.mdx` matches — legacy `docs/widgets/*.md` files are intentionally ignored.
const docGlob = import.meta.glob('../../../docs/widgets/*.mdx') as Record<string, DocLoader>;

const docsBySlug: Record<string, DocLoader> = Object.fromEntries(
  Object.entries(docGlob).map(([file, load]) => {
    const slug = file
      .split('/')
      .pop()!
      .replace(/\.mdx$/, '');
    return [slug, load];
  }),
);

/**
 * The MDX doc loader for a widget, or `null` when none exists. A null result is the
 * signal for `WidgetPage` to render nothing below the canvas — widget docs land
 * incrementally.
 */
export function widgetDoc(slug: string): DocLoader | null {
  return docsBySlug[slug] ?? null;
}

/**
 * The widget doc's `description:` frontmatter, or null when the widget has no
 * doc or the doc has no description. Loads the MDX chunk (small; catalog cards
 * are the only consumer).
 */
export async function widgetDescription(slug: string): Promise<string | null> {
  const load = docsBySlug[slug];
  if (!load) return null;
  const mod = await load();
  return mod.frontmatter?.description ?? null;
}
