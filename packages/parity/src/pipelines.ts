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
export async function loadTailwindConfig(dir: string): Promise<Config> {
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
  return runFrom(plugins, path.join(widgetDir, 'src/styles.css'));
}

/** Compile an arbitrary `@tailwind`-bearing CSS entry file through the given
 * PostCSS plugin chain. `from` controls postcss-import resolution and the
 * Tailwind base/components/utilities the file pulls in. */
export async function runFrom(plugins: postcss.AcceptedPlugin[], from: string): Promise<string> {
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
 * widgets/* and packages/ui) + autoprefixer + the real remToPxPlugin. Since the
 * H1 fix the studio Vite config runs the same rem→px transform a shipped widget
 * gets (studio/vite.config.ts), so this mirror must too — the dev pipeline
 * definition must always equal what the studio actually runs. */
export async function compileDevCss(widgetDir: string): Promise<string> {
  const config = await loadTailwindConfig(path.join(repoRoot, 'studio'));
  return run([postcssImport(), tailwindcss(config), autoprefixer(), remToPxPlugin], widgetDir);
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

/** Components-path side (a): the STUDIO light-DOM pipeline as `ComponentPreview`
 * runs it today — studio tailwind config (scans studio src + widgets + ui),
 * processing the studio's own `src/styles.css`, + the real remToPxPlugin. Since
 * the H1 fix the studio Vite config applies rem→px to every sheet it serves
 * (studio/vite.config.ts), so the gallery sheet gets it too — this mirror must
 * match what the studio actually runs. */
export async function compileComponentDevCss(): Promise<string> {
  const config = await loadTailwindConfig(path.join(repoRoot, 'studio'));
  return runFrom(
    [postcssImport(), tailwindcss(config), autoprefixer(), remToPxPlugin],
    path.join(repoRoot, 'studio/src/styles.css'),
  );
}

/** Components-path side (b): what those same `@perimeter/ui` classes become
 * inside a shipped widget — the widget (production) plugin chain (content =
 * packages/ui/src only, + the real remToPxPlugin). */
export async function compileComponentProdCss(): Promise<string> {
  const base = await loadTailwindConfig(path.join(repoRoot, 'studio'));
  const config: Config = {
    ...base,
    content: [path.join(repoRoot, 'packages/ui/src/**/*.{ts,tsx}')],
  };
  return run(
    [postcssImport(), tailwindcss(config), autoprefixer(), remToPxPlugin],
    path.join(repoRoot, 'widgets/example'),
  );
}
