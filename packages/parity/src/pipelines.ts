import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import { remToPxPlugin } from '@perimeter/vite-plugin-widget';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** Compile a Tailwind v4 CSS entry file through the given PostCSS plugin
 * chain. `from` controls how the entry's own `@import`/`@config`/`@source`
 * directives resolve — v4's postcss plugin handles imports itself (no
 * postcss-import) and reads the tailwind config from the entry's `@config`. */
export async function runFrom(plugins: postcss.AcceptedPlugin[], from: string): Promise<string> {
  const source = readFileSync(from, 'utf8');
  const result = await postcss(plugins).process(source, { from });
  return result.css;
}

async function run(plugins: postcss.AcceptedPlugin[], widgetDir: string): Promise<string> {
  return runFrom(plugins, path.join(widgetDir, 'src/styles.css'));
}

/** Production pipeline: the v4 postcss plugin + the real remToPxPlugin from
 * widgetConfig(). The widget's tailwind.config.ts is loaded by the `@config`
 * directive in its own styles.css. Pre-minification. */
export async function compileProdCss(widgetDir: string): Promise<string> {
  return run([tailwindcss(), remToPxPlugin], widgetDir);
}

/** Dev (studio) pipeline. Under Tailwind v4 the studio processes each widget's
 * styles.css with the SAME plugin and the file's own `@config` — the config is
 * a property of the CSS entry, not of the processing app — so dev and prod are
 * identical by construction. The function is kept distinct so the regression
 * gate still states the dev≡prod invariant explicitly (and catches any future
 * re-divergence of the two chains). */
export async function compileDevCss(widgetDir: string): Promise<string> {
  return run([tailwindcss(), remToPxPlugin], widgetDir);
}

const uiOnlyEntry = path.join(repoRoot, 'packages/parity/fixtures/ui-only/styles.css');

/** Classes generated for @perimeter/ui source alone — used to attribute
 * dev-only selectors to ui components (H2). Compiles the ui-only fixture,
 * whose `@config` scans packages/ui/src exclusively. */
export async function compileUiOnlyCss(): Promise<string> {
  return runFrom([tailwindcss()], uiOnlyEntry);
}

/** Components-path side (a): the STUDIO light-DOM pipeline as `ComponentPreview`
 * runs it — the studio's own `src/styles.css` (its `@config` loads the studio
 * tailwind config, which scans studio src + widgets + ui) + the real
 * remToPxPlugin, matching studio/vite.config.ts. */
export async function compileComponentDevCss(): Promise<string> {
  return runFrom([tailwindcss(), remToPxPlugin], path.join(repoRoot, 'studio/src/styles.css'));
}

/** Components-path side (b): what those same `@perimeter/ui` classes become
 * inside a shipped widget — the ui-only fixture through the widget (production)
 * plugin chain, + the real remToPxPlugin. */
export async function compileComponentProdCss(): Promise<string> {
  return runFrom([tailwindcss(), remToPxPlugin], uiOnlyEntry);
}
