import type { ComponentType } from 'react';

interface DocModule {
  default: ComponentType;
  /** Exposed by remark-mdx-frontmatter; absent for docs without frontmatter. */
  frontmatter?: { description?: string };
}
type DocLoader = () => Promise<DocModule>;

// Per-widget MDX docs under `docs/widgets/<slug>.mdx`. Only the `description:`
// frontmatter is consumed now — the widget page stopped rendering the doc body,
// since everything it told an embedder is already on that page. The files stay
// because that one line is the subtitle under the widget title and on catalog
// cards.
//
// The glob is LAZY (eager:false) so each doc is a separate async chunk. Pattern is
// relative to THIS file (studio/src/lib/): `../../../` reaches repo root. Never
// `/…`, which Vite resolves against the studio project root and matches nothing
// (the same trap discovery.ts documents).
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
