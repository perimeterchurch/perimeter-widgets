import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";

import { TOKEN_GROUPS } from "@/lib/token-usage";
import { TokenPageClient } from "@/components/site/token-page-client";

import type { TokenValues } from "@/lib/token-usage";

export const metadata: Metadata = {
  title: "Design Tokens",
  description:
    "All CSS custom properties from the Perimeter Style default theme. OKLCH color format with light and dark mode values.",
  openGraph: {
    title: "Design Tokens — Perimeter Style",
    description:
      "All CSS custom properties from the Perimeter Style default theme.",
  },
};

interface ThemeFile {
  cssVars: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
}

function readTokenValues(): { values: TokenValues; rawJson: string } {
  const raw = readFileSync(
    join(process.cwd(), "registry", "themes", "default.json"),
    "utf-8",
  );
  const theme = JSON.parse(raw) as ThemeFile;
  return {
    values: { light: theme.cssVars.light, dark: theme.cssVars.dark },
    rawJson: JSON.stringify(theme.cssVars, null, 2),
  };
}

export default function TokensPage() {
  const { values: tokenValues, rawJson } = readTokenValues();

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Design Tokens</h1>
        <p className="mt-1 text-muted-foreground">
          All CSS custom properties from the default theme. Click any token to
          copy its CSS variable name.
        </p>
      </div>

      <TokenPageClient
        groups={TOKEN_GROUPS}
        values={tokenValues}
        rawJson={rawJson}
      />
    </div>
  );
}
