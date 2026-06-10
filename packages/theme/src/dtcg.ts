import { darkTokens, globalTokens, type ThemeToken } from './tokens';

/**
 * DTCG (W3C Design Tokens Community Group) 2025.10 export of the theme tokens.
 *
 * The CSS-variable token system stays the source of truth — this is a
 * derived interchange document for design-tool interop (Figma/Penpot/Tokens
 * Studio import, Style Dictionary/Terrazzo pipelines), adopted as a
 * future-proofing measure in the 2026-06-10 platform tooling audit. The
 * committed `tokens.dtcg.json` is regenerated with `pnpm tokens:dtcg` and a
 * sync-guard test fails the gate whenever it drifts from `tokens.ts`.
 *
 * Theming note: DTCG 2025.10 models themes via its Resolver module, which the
 * flagship tooling does not fully support yet — so light/dark ship as two
 * plain top-level groups, the most portable encoding today.
 */

interface ColorToken {
  $type: 'color';
  $value: { colorSpace: 'hsl'; components: [number, number, number]; alpha: number };
}

interface DimensionToken {
  $type: 'dimension';
  $value: { value: number; unit: 'px' };
}

interface FontFamilyToken {
  $type: 'fontFamily';
  $value: string[];
}

export interface DtcgThemeGroup {
  color: Record<string, ColorToken>;
  radius: Record<string, DimensionToken>;
  font: Record<string, FontFamilyToken>;
}

export interface DtcgDocument {
  $description: string;
  light: DtcgThemeGroup;
  dark: DtcgThemeGroup;
}

function colorToken(value: string): ColorToken {
  const m = value.match(/^hsl\((\d+(?:\.\d+)?) (\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%\)$/);
  if (!m) throw new Error(`token is not in this repo's hsl format: ${value}`);
  return {
    $type: 'color',
    $value: {
      colorSpace: 'hsl',
      components: [Number(m[1]), Number(m[2]), Number(m[3])],
      alpha: 1,
    },
  };
}

function dimensionToken(value: string): DimensionToken {
  const m = value.match(/^(\d+(?:\.\d+)?)px$/);
  if (!m) throw new Error(`token is not a px dimension: ${value}`);
  return { $type: 'dimension', $value: { value: Number(m[1]), unit: 'px' } };
}

function fontFamilyToken(value: string): FontFamilyToken {
  return { $type: 'fontFamily', $value: value.split(',').map((f) => f.trim()) };
}

function themeGroup(tokens: Record<ThemeToken, string>): DtcgThemeGroup {
  const group: DtcgThemeGroup = { color: {}, radius: {}, font: {} };
  for (const [key, value] of Object.entries(tokens) as [ThemeToken, string][]) {
    if (key.startsWith('color-')) group.color[key.slice('color-'.length)] = colorToken(value);
    else if (key.startsWith('radius-'))
      group.radius[key.slice('radius-'.length)] = dimensionToken(value);
    else if (key.startsWith('font-'))
      group.font[key.slice('font-'.length)] = fontFamilyToken(value);
    else throw new Error(`unmapped token namespace: ${key}`);
  }
  return group;
}

export function toDtcg(): DtcgDocument {
  return {
    $description:
      'Perimeter widget design tokens (DTCG 2025.10). Derived from @perimeter/theme src/tokens.ts — regenerate with `pnpm tokens:dtcg`; do not edit by hand.',
    light: themeGroup(globalTokens),
    dark: themeGroup(darkTokens),
  };
}
