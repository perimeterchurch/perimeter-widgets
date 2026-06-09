// URLs of each widget's built IIFE, keyed by slug. `?url` gives a dev-server URL
// to the file on disk; eager so the map is sync. DEV-only — dist may not exist.
//
// Glob patterns are relative to THIS file (studio/src/lib/): `../../../` reaches
// the repo root (NOT `/…`, which Vite resolves against the studio project root).
// `?url` + `import: 'default'` resolves each entry to a string URL; the eager glob
// types values as `unknown`, so annotate the map as the string record it actually is.
const urls: Record<string, string> = import.meta.glob('../../../widgets/*/dist/index.js', {
  query: '?url',
  import: 'default',
  eager: true,
});

/**
 * Resolve the dev-server URL of a widget's built IIFE by slug, or `null` if the
 * widget has not been built yet (no `widgets/<slug>/dist/index.js`). The keys are
 * glob paths, so match on the `/widgets/<slug>/dist/` suffix rather than equality.
 */
export function builtBundleUrl(slug: string): string | null {
  const hit = Object.entries(urls).find(([p]) => p.includes(`/widgets/${slug}/dist/`));
  return hit ? hit[1] : null;
}
