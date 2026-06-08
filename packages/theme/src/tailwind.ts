import type { Config } from 'tailwindcss';
import containerQueries from '@tailwindcss/container-queries';
import { globalTokens, type ThemeToken } from './tokens';

/**
 * Re-target the `dark:` variant to our explicit `data-theme` flag instead of
 * Tailwind's default `darkMode: 'media'` (which compiles every `dark:` utility
 * to `@media (prefers-color-scheme: dark)` — keyed off the visitor's OS, not the
 * widget's theme). Two selectors cover both rendering contexts:
 *   - `:host([data-theme="dark"]) &` — widgets render inside a shadow root; the
 *     host is OUTSIDE the shadow tree, so a plain descendant selector can never
 *     reach it. `:host(...)` is the only selector that does.
 *   - `:where([data-theme="dark"]) &` — the studio chrome renders in the light
 *     DOM, where `data-theme` lives on an ancestor element. `:where()` keeps the
 *     specificity at zero so it matches the shadow case's weight.
 *
 * We use Tailwind v3's `darkMode: ['variant', [...]]` form (NOT `'media'` or
 * `'class'`): `'variant'` is the only mode that (a) disables the built-in
 * `prefers-color-scheme` emission AND (b) lets us supply arbitrary selectors,
 * including the `:host()` shadow-boundary case that `'class'` cannot express.
 * (A plugin `addVariant('dark', …)` does NOT work here — Tailwind's core
 * darkMode plugin still registers the built-in media-query `dark` variant, so
 * the override never wins.)
 */
const darkVariantSelectors = [':host([data-theme="dark"]) &', ':where([data-theme="dark"]) &'];

function cssVar(token: ThemeToken): string {
  return `var(--${token})`;
}

const colorTokens = (Object.keys(globalTokens) as ThemeToken[]).filter((k) =>
  k.startsWith('color-'),
);
const radiusTokens = (Object.keys(globalTokens) as ThemeToken[]).filter((k) =>
  k.startsWith('radius-'),
);

const colors: Record<string, string> = {};
for (const t of colorTokens) {
  const name = t.slice('color-'.length);
  colors[name] = cssVar(t);
}

const borderRadius: Record<string, string> = {};
for (const t of radiusTokens) {
  borderRadius[t.slice('radius-'.length)] = cssVar(t);
}

/**
 * Tailwind `content` globs for a widget build. Relative globs resolve against
 * cwd, which is the widget directory during `vite build` — identical mechanism
 * to the original './src' glob. MUST include every workspace package whose
 * components a widget can render: classes used only inside that source are
 * otherwise purged from the shipped bundle (parity finding H2, 2026-06-02).
 */
export const widgetContent: string[] = [
  './src/**/*.{ts,tsx}',
  '../../packages/ui/src/**/*.{ts,tsx}',
];

export const tailwindPreset: Config = {
  content: [],
  darkMode: ['variant', darkVariantSelectors],
  plugins: [containerQueries],
  theme: {
    extend: {
      colors,
      borderRadius,
      fontFamily: { sans: [cssVar('font-sans')], mono: [cssVar('font-mono')] },
    },
  },
};

export default tailwindPreset;
