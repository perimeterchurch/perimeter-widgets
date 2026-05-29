import { globalTokens, type ThemeToken } from './tokens';

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

export function resolveTokens(args: ResolveTokensArgs): ResolvedTokens {
  const parsedDataAttrs = args.dataAttrOverrides ? parseDataAttrs(args.dataAttrOverrides) : {};
  const merged = {
    ...globalTokens,
    ...args.widgetOverrides,
    ...parsedDataAttrs,
    ...args.runtimeOverrides,
  } as Record<ThemeToken, string>;

  const decls = Object.entries(merged)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join('\n');
  const cssText = `:host {\n${decls}\n}`;

  return { tokens: merged, cssText };
}
