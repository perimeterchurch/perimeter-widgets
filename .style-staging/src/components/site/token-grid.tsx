"use client";

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

import type { TokenGroup, TokenValues } from "@/lib/token-usage";

interface TokenGridProps {
  groups: TokenGroup[];
  values: TokenValues;
}

export function TokenGrid({ groups, values }: TokenGridProps) {
  const { copiedKey, copy } = useCopyToClipboard();

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.name}>
          <div className="mb-3">
            <h3 className="text-lg font-semibold">{group.name}</h3>
            <p className="text-sm text-muted-foreground">
              Used by: {group.usedBy.join(", ")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.tokens.map((token) => {
              const cssVar = `--${token}`;
              const lightValue = values.light[token] ?? "—";
              const darkValue = values.dark[token] ?? "—";
              const isCopied = copiedKey === token;

              return (
                <button
                  key={token}
                  type="button"
                  onClick={() => copy(cssVar, token)}
                  className="group rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/50"
                >
                  {!group.isNonColor && (
                    <div className="mb-2 flex gap-2">
                      <div
                        className="h-10 w-10 rounded border"
                        style={{ backgroundColor: lightValue }}
                        title={`Light: ${lightValue}`}
                        aria-label={`${token} light: ${lightValue}`}
                      />
                      <div
                        className="h-10 w-10 rounded border bg-stone-900"
                        style={{ backgroundColor: darkValue }}
                        title={`Dark: ${darkValue}`}
                        aria-label={`${token} dark: ${darkValue}`}
                      />
                    </div>
                  )}
                  <p className="font-mono text-xs font-medium">
                    {isCopied ? (
                      <span className="text-primary">Copied!</span>
                    ) : (
                      cssVar
                    )}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {lightValue}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
