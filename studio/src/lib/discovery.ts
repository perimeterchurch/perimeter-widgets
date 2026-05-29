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
      const cssKey = `/widgets/${slug}/src/styles.css`;
      const loadCss = css[cssKey] ?? (() => Promise.resolve({ default: '' }));
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

// Live globs (Vite rewrites these at build time). `?inline` for css; eager:false.
export const widgetDefGlob = import.meta.glob('/widgets/*/src/widget.tsx') as GlobMap<{
  default: WidgetDefinition;
}>;
export const widgetCssGlob = import.meta.glob('/widgets/*/src/styles.css', {
  query: '?inline',
  import: 'default',
}) as unknown as GlobMap<{ default: string }>;
export const componentGlob = import.meta.glob('/packages/ui/src/*.tsx') as GlobMap<
  Record<string, unknown>
>;
