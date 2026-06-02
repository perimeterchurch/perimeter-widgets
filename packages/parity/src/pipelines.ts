import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import postcss from 'postcss';
import postcssImport from 'postcss-import';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import type { Config } from 'tailwindcss';
import { remToPxPlugin } from '@perimeter/vite-plugin-widget';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** Load a tailwind.config.ts and resolve its relative content globs against the
 * config's own directory (the build runs with cwd = that directory; the harness
 * does not, so globs must be made absolute to match). */
async function loadTailwindConfig(dir: string): Promise<Config> {
  const mod = (await import(pathToFileURL(path.join(dir, 'tailwind.config.ts')).href)) as {
    default: Config;
  };
  const config = mod.default;
  // Tailwind v3 `content` is either an array or the object form
  // (`{ files: [...] }`, optionally with `relative`/extractors). Each entry is a
  // glob string or a RawFile (`{ raw }`) object; resolve only the string globs
  // against the config's own directory, in both shapes.
  type ContentEntry = string | { raw: string; extension?: string };
  const resolve = (entry: ContentEntry): ContentEntry =>
    typeof entry === 'string' ? (path.isAbsolute(entry) ? entry : path.resolve(dir, entry)) : entry;
  const raw = config.content;
  if (Array.isArray(raw)) {
    return { ...config, content: raw.map(resolve) };
  }
  return { ...config, content: { ...raw, files: raw.files.map(resolve) } };
}

async function run(plugins: postcss.AcceptedPlugin[], widgetDir: string): Promise<string> {
  const from = path.join(widgetDir, 'src/styles.css');
  const source = readFileSync(from, 'utf8');
  const result = await postcss(plugins).process(source, { from });
  return result.css;
}

/** Production pipeline: the widget's own tailwind config (content = widget src only)
 * + autoprefixer + the real remToPxPlugin from widgetConfig(). Pre-minification. */
export async function compileProdCss(widgetDir: string): Promise<string> {
  const config = await loadTailwindConfig(widgetDir);
  return run([postcssImport(), tailwindcss(config), autoprefixer(), remToPxPlugin], widgetDir);
}

/** Dev (studio) pipeline: the STUDIO's tailwind config (content also scans
 * widgets/* and packages/ui) + autoprefixer. No rem→px — exactly what the Vite
 * dev server applies to a widget's styles.css?inline import. */
export async function compileDevCss(widgetDir: string): Promise<string> {
  const config = await loadTailwindConfig(path.join(repoRoot, 'studio'));
  return run([postcssImport(), tailwindcss(config), autoprefixer()], widgetDir);
}

/** Classes generated for @perimeter/ui source alone — used to attribute
 * dev-only selectors to ui components (H2). */
export async function compileUiOnlyCss(): Promise<string> {
  const base = await loadTailwindConfig(path.join(repoRoot, 'studio'));
  const config: Config = {
    ...base,
    content: [path.join(repoRoot, 'packages/ui/src/**/*.{ts,tsx}')],
  };
  return run(
    [postcssImport(), tailwindcss(config), autoprefixer()],
    path.join(repoRoot, 'widgets/example'),
  );
}
