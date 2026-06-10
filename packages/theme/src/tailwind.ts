import type { Config } from 'tailwindcss';
import { globalTokens, type ThemeToken } from './tokens';

function cssVar(token: ThemeToken): string {
  return `var(--${token})`;
}

function tokensByPrefix(prefix: 'color' | 'radius' | 'shadow' | 'text'): ThemeToken[] {
  return (Object.keys(globalTokens) as ThemeToken[]).filter((k) => k.startsWith(`${prefix}-`));
}

const colors: Record<string, string> = {};
for (const t of tokensByPrefix('color')) {
  colors[t.slice('color-'.length)] = cssVar(t);
}

const borderRadius: Record<string, string> = {};
for (const t of tokensByPrefix('radius')) {
  borderRadius[t.slice('radius-'.length)] = cssVar(t);
}

const boxShadow: Record<string, string> = {};
for (const t of tokensByPrefix('shadow')) {
  boxShadow[t.slice('shadow-'.length)] = cssVar(t);
}

/**
 * Per-size unitless line-heights matching Tailwind's defaults at the token's
 * default px size (e.g. text-sm 14px/20px → 1.4286). Unitless so a
 * `data-theme-text-*` override scales its leading proportionally.
 */
const FONT_SIZE_LINE_HEIGHTS: Record<string, string> = {
  xs: '1.3333',
  sm: '1.4286',
  base: '1.5',
  lg: '1.5556',
  xl: '1.4',
};

const fontSize: Record<string, [string, { lineHeight: string }]> = {};
for (const t of tokensByPrefix('text')) {
  const name = t.slice('text-'.length);
  const lineHeight = FONT_SIZE_LINE_HEIGHTS[name];
  if (!lineHeight) throw new Error(`text token "${t}" has no line-height mapping`);
  fontSize[name] = [cssVar(t), { lineHeight }];
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
      boxShadow,
      fontSize,
      fontFamily: { sans: [cssVar('font-sans')], mono: [cssVar('font-mono')] },
    },
  },
};

export default tailwindPreset;
