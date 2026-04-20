"use client";

import { useMemo, useState } from "react";

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

import type { TokenGroup, TokenValues } from "@/lib/token-usage";

interface TokenTableProps {
  groups: TokenGroup[];
  values: TokenValues;
}

interface FlatToken {
  group: string;
  token: string;
  cssVar: string;
  lightValue: string;
  darkValue: string;
  isNonColor: boolean;
}

type SortKey = "token" | "group" | "lightValue" | "darkValue";
type SortDirection = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "token", label: "Token Name" },
  { key: "group", label: "Group" },
  { key: "lightValue", label: "Light Value" },
  { key: "darkValue", label: "Dark Value" },
];

function flattenTokens(groups: TokenGroup[], values: TokenValues): FlatToken[] {
  const result: FlatToken[] = [];
  for (const group of groups) {
    for (const token of group.tokens) {
      result.push({
        group: group.name,
        token,
        cssVar: `--${token}`,
        lightValue: values.light[token] ?? "—",
        darkValue: values.dark[token] ?? "—",
        isNonColor: group.isNonColor ?? false,
      });
    }
  }
  return result;
}

function sortTokens(
  tokens: FlatToken[],
  key: SortKey,
  direction: SortDirection,
): FlatToken[] {
  return [...tokens].sort((a, b) => {
    const cmp = a[key].localeCompare(b[key]);
    return direction === "asc" ? cmp : -cmp;
  });
}

export function TokenTable({ groups, values }: TokenTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("token");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const { copiedKey, copy } = useCopyToClipboard();

  const allTokens = useMemo(
    () => flattenTokens(groups, values),
    [groups, values],
  );

  const sorted = useMemo(
    () => sortTokens(allTokens, sortKey, sortDir),
    [allTokens, sortKey, sortDir],
  );

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortIndicator(key: SortKey): string {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " \u2191" : " \u2193";
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Preview</th>
              {COLUMNS.map((col) => (
                <th key={col.key} className="px-4 py-2 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className="hover:text-foreground"
                  >
                    {col.label}
                    {sortIndicator(col.key)}
                  </button>
                </th>
              ))}
              <th className="px-4 py-2 text-left font-medium">CSS Variable</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => (
              <tr
                key={t.token}
                className="border-b last:border-b-0 hover:bg-muted/30"
              >
                <td className="px-4 py-2">
                  {!t.isNonColor ? (
                    <div className="flex gap-1">
                      <div
                        className="h-6 w-6 rounded border"
                        style={{ backgroundColor: t.lightValue }}
                        title={`Light: ${t.lightValue}`}
                        aria-label={`${t.token} light: ${t.lightValue}`}
                      />
                      <div
                        className="h-6 w-6 rounded border bg-stone-900"
                        style={{ backgroundColor: t.darkValue }}
                        title={`Dark: ${t.darkValue}`}
                        aria-label={`${t.token} dark: ${t.darkValue}`}
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{t.token}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {t.group}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{t.lightValue}</td>
                <td className="px-4 py-2 font-mono text-xs">{t.darkValue}</td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => copy(t.cssVar, t.token)}
                    className="font-mono text-xs text-muted-foreground hover:text-foreground"
                  >
                    {copiedKey === t.token ? (
                      <span className="text-primary">Copied!</span>
                    ) : (
                      t.cssVar
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
