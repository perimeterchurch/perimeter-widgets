import { darkTokens, globalTokens, type ThemeToken } from './tokens';

const DATA_THEME_PREFIX = 'data-theme-';

export interface ResolveTokensArgs {
  widgetOverrides?: Partial<Record<ThemeToken, string>> | undefined;
  dataAttrOverrides?: Record<string, string> | undefined;
  runtimeOverrides?: Partial<Record<ThemeToken, string>> | undefined;
}

export interface ResolvedTokens {
  tokens: Record<ThemeToken, string>;
  cssText: string;
}

function isThemeToken(key: string): key is ThemeToken {
  return Object.prototype.hasOwnProperty.call(globalTokens, key);
}

function parseDataAttrs(input: Record<string, string>): Partial<Record<ThemeToken, string>> {
  const out: Partial<Record<ThemeToken, string>> = {};
  for (const [rawName, value] of Object.entries(input)) {
    if (!rawName.startsWith(DATA_THEME_PREFIX)) continue;
    const name = rawName.slice(DATA_THEME_PREFIX.length);
    if (!isThemeToken(name)) {
      console.warn(`[@perimeter/theme] unknown token "${name}" — dropping`);
      continue;
    }
    out[name] = value;
  }
  return out;
}

function declBlock(
  base: Record<ThemeToken, string>,
  overrides: ResolveTokensArgs,
  parsedDataAttrs: Partial<Record<ThemeToken, string>>,
): { merged: Record<ThemeToken, string>; decls: string } {
  const merged = {
    ...base,
    ...overrides.widgetOverrides,
    ...parsedDataAttrs,
    ...overrides.runtimeOverrides,
  } as Record<ThemeToken, string>;

  const decls = Object.entries(merged)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join('\n');
  return { merged, decls };
}

export function resolveTokens(args: ResolveTokensArgs): ResolvedTokens {
  const parsedDataAttrs = args.dataAttrOverrides ? parseDataAttrs(args.dataAttrOverrides) : {};
  const light = declBlock(globalTokens, args, parsedDataAttrs);
  const dark = declBlock(darkTokens, args, parsedDataAttrs);

  const cssText = `:host {\n${light.decls}\n}\n:host([data-theme="dark"]) {\n${dark.decls}\n}`;

  // `tokens` stays the light merged set for back-compat (only theme tests read it).
  return { tokens: light.merged, cssText };
}
