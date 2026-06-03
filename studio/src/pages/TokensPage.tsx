import { useMemo } from 'react';
import { globalTokens, type ThemeToken } from '@perimeter/theme';
import { Badge } from '@perimeter/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@perimeter/ui/card';

type TokenRow = { token: ThemeToken; value: string };

/** Split the flat token map into the three display groups, preserving source order. */
function partitionTokens(): { color: TokenRow[]; radius: TokenRow[]; font: TokenRow[] } {
  const color: TokenRow[] = [];
  const radius: TokenRow[] = [];
  const font: TokenRow[] = [];
  for (const [key, value] of Object.entries(globalTokens) as [ThemeToken, string][]) {
    if (key.startsWith('color-')) color.push({ token: key, value });
    else if (key.startsWith('radius-')) radius.push({ token: key, value });
    else if (key.startsWith('font-')) font.push({ token: key, value });
  }
  return { color, radius, font };
}

/** The css custom-property name, shown verbatim so it can be copied into an override. */
function VarName({ token }: { token: ThemeToken }) {
  return <code className="font-mono text-xs text-muted-fg">{`--${token}`}</code>;
}

/** A swatch + var-name + literal value, painted from the live `:root` token layer. */
function ColorSwatch({ token, value }: TokenRow) {
  return (
    <li className="flex items-center gap-3">
      <span
        data-token-swatch={token}
        aria-hidden
        className="size-10 shrink-0 rounded-md border border-border shadow-sm"
        style={{ background: `var(--${token})` }}
      />
      <span className="min-w-0 flex-1">
        <VarName token={token} />
        <span className="block truncate font-mono text-xs text-muted-fg/80">{value}</span>
      </span>
    </li>
  );
}

/** A box whose corners are rounded by the token, next to its name + value. */
function RadiusSample({ token, value }: TokenRow) {
  return (
    <li className="flex items-center gap-3">
      <span
        data-token-radius={token}
        aria-hidden
        className="size-10 shrink-0 border border-border bg-muted"
        style={{ borderRadius: `var(--${token})` }}
      />
      <span className="min-w-0 flex-1">
        <VarName token={token} />
        <span className="block font-mono text-xs text-muted-fg/80">{value}</span>
      </span>
    </li>
  );
}

/** A line of text set in the token's own stack, with its name + the full stack. */
function FontSample({ token, value }: TokenRow) {
  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <VarName token={token} />
      </div>
      <p
        data-token-font={token}
        className="text-2xl leading-tight text-fg"
        style={{ fontFamily: `var(--${token})` }}
      >
        The quick brown fox jumps over the lazy dog
      </p>
      <p className="font-mono text-xs leading-relaxed text-muted-fg/80">{value}</p>
    </li>
  );
}

/**
 * The live design-token reference. Reads `@perimeter/theme`'s `globalTokens` (the
 * single source the production widgets and the studio chrome both consume) and
 * renders every color/radius/font token painted from the actual `:root` custom
 * properties — so a token change shows up here verbatim. Data-driven: no counts
 * or token names are hard-coded.
 */
export function TokensPage() {
  const { color, radius, font } = useMemo(partitionTokens, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
          Design system
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-fg">Tokens</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-fg">
          The global palette that every widget and this studio share. Each embed can override any
          token per page — set <code className="font-mono text-sm text-fg">data-theme-*</code>{' '}
          attributes on the mount element (e.g.{' '}
          <code className="font-mono text-sm text-fg">data-theme-color-primary</code>), or call{' '}
          <code className="font-mono text-sm text-fg">updateTokens()</code> at runtime. Unset tokens
          fall back to these defaults.
        </p>
      </header>

      <section className="mt-10" aria-labelledby="tokens-color">
        <Card>
          <CardHeader className="flex-row items-baseline justify-between gap-3">
            <CardTitle id="tokens-color" className="text-base">
              Color
            </CardTitle>
            <Badge variant="outline" className="tabular-nums">
              {color.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              {color.map((row) => (
                <ColorSwatch key={row.token} {...row} />
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6" aria-labelledby="tokens-radius">
        <Card>
          <CardHeader className="flex-row items-baseline justify-between gap-3">
            <CardTitle id="tokens-radius" className="text-base">
              Radius
            </CardTitle>
            <Badge variant="outline" className="tabular-nums">
              {radius.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
              {radius.map((row) => (
                <RadiusSample key={row.token} {...row} />
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6" aria-labelledby="tokens-font">
        <Card>
          <CardHeader className="flex-row items-baseline justify-between gap-3">
            <CardTitle id="tokens-font" className="text-base">
              Typography
            </CardTitle>
            <Badge variant="outline" className="tabular-nums">
              {font.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <ul className="space-y-6">
              {font.map((row) => (
                <FontSample key={row.token} {...row} />
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
