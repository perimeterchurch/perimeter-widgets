import type { Config } from 'tailwindcss';
import { globalTokens, type ThemeToken } from './tokens';

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

/**
 * Legacy-format Tailwind config preset, loaded by each entry's
 * `tailwind.config.ts` via the v4 `@config` compatibility directive. Maps the
 * semantic utility names (bg-primary, rounded-md, font-sans, …) onto the
 * runtime CSS variables that `resolveTokens` injects per host.
 *
 * The `dark:` variant re-targeting lives in `src/tailwind.css`
 * (`@custom-variant`), which every CSS entry imports — v4 has no JS-config
 * equivalent for the `:host()` shadow-boundary selector this repo needs.
 * Container queries are core in v4, so no plugin is registered.
 */
export const tailwindPreset: Config = {
  content: [],
  theme: {
    extend: {
      colors,
      borderRadius,
      fontFamily: { sans: [cssVar('font-sans')], mono: [cssVar('font-mono')] },
    },
  },
};

export default tailwindPreset;
