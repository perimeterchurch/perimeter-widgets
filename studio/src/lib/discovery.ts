import type { WidgetDefinition } from '@perimeter/widget-runtime';

type Importer<T> = () => Promise<T>;
type GlobMap<T> = Record<string, Importer<T>>;

export interface WidgetEntry {
  slug: string;
  load: Importer<{ default: WidgetDefinition }>;
  loadCss: Importer<{ default: string }>;
}
export interface ComponentEntry {
  name: string;
  load: Importer<Record<string, unknown>>;
}

export function toWidgetEntries(
  defs: GlobMap<{ default: WidgetDefinition }>,
  css: GlobMap<{ default: string }> = {},
): WidgetEntry[] {
  return Object.entries(defs)
    .map(([file, load]) => {
      const slug = file.split('/widgets/')[1]!.split('/')[0]!;
      // Match the css glob entry by slug — glob keys may be relative
      // (`../../../widgets/<slug>/src/styles.css`) or absolute, so match on suffix.
      const cssEntry = Object.entries(css).find(([key]) =>
        key.includes(`/widgets/${slug}/src/styles.css`),
      );
      const loadCss = cssEntry ? cssEntry[1] : () => Promise.resolve({ default: '' });
      return { slug, load, loadCss };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export function toComponentEntries(mods: GlobMap<Record<string, unknown>>): ComponentEntry[] {
  return Object.entries(mods)
    .map(([file, load]) => ({
      name: file
        .split('/')
        .pop()!
        .replace(/\.tsx$/, ''),
      load,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Live globs. Patterns are relative to THIS file (studio/src/lib/), i.e. `../../../`
// reaches the repo root — NOT `/…`, which Vite resolves against the studio project
// root (studio/) and would match nothing. `?inline` for css; eager:false.
export const widgetDefGlob = import.meta.glob('../../../widgets/*/src/widget.tsx') as GlobMap<{
  default: WidgetDefinition;
}>;
// NOTE: `query: '?inline'` only (no `import: 'default'`). With `import: 'default'`
// the importer resolves to the raw css string, so consumers reading `.default`
// would get undefined; without it the importer returns the module `{ default: css }`,
// matching `GlobMap<{ default: string }>` and how WidgetPreview reads it.
export const widgetCssGlob = import.meta.glob('../../../widgets/*/src/styles.css', {
  query: '?inline',
}) as unknown as GlobMap<{ default: string }>;
export const componentGlob = import.meta.glob('../../../packages/ui/src/*.tsx') as GlobMap<
  Record<string, unknown>
>;
