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

interface ShadowLayer {
  color: { colorSpace: 'srgb'; components: [number, number, number]; alpha: number };
  offsetX: DimensionToken['$value'];
  offsetY: DimensionToken['$value'];
  blur: DimensionToken['$value'];
  spread: DimensionToken['$value'];
}

interface ShadowToken {
  $type: 'shadow';
  $value: ShadowLayer[];
}

export interface DtcgThemeGroup {
  color: Record<string, ColorToken>;
  radius: Record<string, DimensionToken>;
  font: Record<string, FontFamilyToken>;
  shadow: Record<string, ShadowToken>;
  text: Record<string, DimensionToken>;
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

/** Parse this repo's shadow format: comma-separated `X Y BLUR [SPREAD] rgb(R G B / A)` layers. */
function shadowToken(value: string): ShadowToken {
  const layers = value.split(/,(?![^(]*\))/).map((layer): ShadowLayer => {
    const m = layer
      .trim()
      .match(
        /^(-?\d+(?:\.\d+)?)(?:px)? (-?\d+(?:\.\d+)?)(?:px)? (-?\d+(?:\.\d+)?)(?:px)?(?: (-?\d+(?:\.\d+)?)(?:px)?)? rgb\((\d+) (\d+) (\d+) \/ (\d+(?:\.\d+)?)\)$/,
      );
    if (!m) throw new Error(`token is not in this repo's shadow format: ${layer}`);
    const px = (n: string | undefined): DimensionToken['$value'] => ({
      value: Number(n ?? 0),
      unit: 'px',
    });
    return {
      color: {
        colorSpace: 'srgb',
        components: [Number(m[5]) / 255, Number(m[6]) / 255, Number(m[7]) / 255],
        alpha: Number(m[8]),
      },
      offsetX: px(m[1]),
      offsetY: px(m[2]),
      blur: px(m[3]),
      spread: px(m[4]),
    };
  });
  return { $type: 'shadow', $value: layers };
}

function themeGroup(tokens: Record<ThemeToken, string>): DtcgThemeGroup {
  const group: DtcgThemeGroup = { color: {}, radius: {}, font: {}, shadow: {}, text: {} };
  for (const [key, value] of Object.entries(tokens) as [ThemeToken, string][]) {
    if (key.startsWith('color-')) group.color[key.slice('color-'.length)] = colorToken(value);
    else if (key.startsWith('radius-'))
      group.radius[key.slice('radius-'.length)] = dimensionToken(value);
    else if (key.startsWith('font-'))
      group.font[key.slice('font-'.length)] = fontFamilyToken(value);
    else if (key.startsWith('shadow-'))
      group.shadow[key.slice('shadow-'.length)] = shadowToken(value);
    else if (key.startsWith('text-')) group.text[key.slice('text-'.length)] = dimensionToken(value);
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
