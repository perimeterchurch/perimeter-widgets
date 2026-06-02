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
