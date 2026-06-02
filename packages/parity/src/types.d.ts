// Ambient declarations for PostCSS plugins that ship no TypeScript types.
// They are all PostCSS plugin factories; typing them as such keeps the
// pipeline strictly typed without weakening the harness.
declare module 'postcss-import' {
  import type { PluginCreator } from 'postcss';
  const postcssImport: PluginCreator<unknown>;
  export default postcssImport;
}

declare module 'tailwindcss' {
  import type { PluginCreator } from 'postcss';
  export interface Config {
    presets?: unknown[];
    content?: string[] | { files: string[] } | Record<string, unknown>;
    theme?: Record<string, unknown>;
    plugins?: unknown[];
  }
  const tailwindcss: PluginCreator<Config>;
  export default tailwindcss;
}

declare module 'autoprefixer' {
  import type { PluginCreator } from 'postcss';
  const autoprefixer: PluginCreator<unknown>;
  export default autoprefixer;
}
