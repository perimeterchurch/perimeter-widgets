// Ambient declaration for postcss-import, which ships no TypeScript types.
// It is a PostCSS plugin factory; typing it as such keeps the pipeline strictly
// typed without weakening the harness. (tailwindcss and autoprefixer ship their
// own types and must not be shadowed here.)
declare module 'postcss-import' {
  import type { PluginCreator } from 'postcss';
  const postcssImport: PluginCreator<unknown>;
  export default postcssImport;
}
