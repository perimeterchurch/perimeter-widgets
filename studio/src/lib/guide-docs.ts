import type { ComponentType } from 'react';

type DocLoader = () => Promise<{ default: ComponentType }>;

export interface GuideDoc {
  slug: string;
  title: string;
  load: DocLoader;
}

// Authored MDX guides, single-sourced under `docs/guides-mdx/*.mdx` (a dedicated
// directory so they don't collide with the legacy `docs/guides/*.md` Phase 5 prunes).
// The glob is LAZY (eager:false) so each guide is its own async chunk — GuidePage
// Suspends on the one it needs. Pattern is relative to THIS file (studio/src/lib/):
// `../../../` reaches repo root. Never `/…`, which Vite resolves against the studio
// project root and matches nothing (the same trap discovery.ts documents).
const guideGlob = import.meta.glob('../../../docs/guides-mdx/*.mdx') as Record<string, DocLoader>;

// Derive a slug from the filename (`styling-widgets.mdx` → `styling-widgets`) and a
// human title by prettifying the slug (kebab → Title Case). The guide's own `# `
// heading owns the on-page title; this title is just for the sidebar/nav label.
function slugFromFile(file: string): string {
  return file
    .split('/')
    .pop()!
    .replace(/\.mdx$/, '');
}

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const guidesBySlug: Record<string, GuideDoc> = Object.fromEntries(
  Object.entries(guideGlob).map(([file, load]) => {
    const slug = slugFromFile(file);
    return [slug, { slug, title: titleFromSlug(slug), load }];
  }),
);

/** All discovered guides, sorted by title — the source for the sidebar nav. */
export function listGuides(): GuideDoc[] {
  return Object.values(guidesBySlug).sort((a, b) => a.title.localeCompare(b.title));
}

/** The guide for a slug, or `null` when none exists (GuidePage renders 404). */
export function guideDoc(slug: string): GuideDoc | null {
  return guidesBySlug[slug] ?? null;
}
