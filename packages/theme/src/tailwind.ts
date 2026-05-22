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
