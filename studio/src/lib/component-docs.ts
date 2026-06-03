import type { ComponentType } from 'react';

type DocLoader = () => Promise<{ default: ComponentType }>;

// Component MDX docs, single-sourced under `docs/components/*.mdx`. The glob is
// LAZY (eager:false) so each doc is a separate async chunk — the page Suspends on
// the one it needs. Pattern is relative to THIS file (studio/src/lib/): `../../../`
// reaches repo root. Never `/…`, which Vite resolves against the studio root and
// matches nothing (the same trap discovery.ts documents).
const docGlob = import.meta.glob('../../../docs/components/*.mdx') as Record<string, DocLoader>;

// Key the loaders by component basename (`button.mdx` → `button`) so a route param
// maps straight to a doc. Built once at module load; the glob set is static.
const docsByName: Record<string, DocLoader> = Object.fromEntries(
  Object.entries(docGlob).map(([file, load]) => {
    const name = file
      .split('/')
      .pop()!
      .replace(/\.mdx$/, '');
    return [name, load];
  }),
);

/**
 * The MDX doc loader for a component, or `null` when none exists yet. A null
 * result is the signal for `ComponentPage` to fall back to the auto-gallery —
 * docs land incrementally across the discovered @perimeter/ui components.
 */
export function componentDoc(name: string): DocLoader | null {
  return docsByName[name] ?? null;
}
