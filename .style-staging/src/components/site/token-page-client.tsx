"use client";

import { useMemo, useState } from "react";

import { TokenGrid } from "@/components/site/token-grid";
import { TokenTable } from "@/components/site/token-table";

import type { TokenGroup, TokenValues } from "@/lib/token-usage";

type ViewMode = "grid" | "table";

interface TokenPageClientProps {
  groups: TokenGroup[];
  values: TokenValues;
  rawJson: string;
}

export function TokenPageClient({
  groups,
  values,
  rawJson,
}: TokenPageClientProps) {
  const [view, setView] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [copied, setCopied] = useState(false);

  const categories = useMemo(() => {
    return ["all", ...groups.map((g) => g.name)];
  }, [groups]);

  const filteredGroups = useMemo(() => {
    return groups
      .filter((group) => {
        if (activeCategory === "all") return true;
        return group.name === activeCategory;
      })
      .map((group) => {
        if (!search) return group;
        const filtered = group.tokens.filter((t) =>
          t.toLowerCase().includes(search.toLowerCase()),
        );
        return filtered.length > 0 ? { ...group, tokens: filtered } : null;
      })
      .filter(Boolean) as TokenGroup[];
  }, [groups, search, activeCategory]);

  function copyThemeJson() {
    navigator.clipboard.writeText(rawJson).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search tokens..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={copyThemeJson}
            className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80"
          >
            {copied ? "Copied!" : "Copy JSON"}
          </button>

          <div className="flex gap-1 rounded-lg border bg-muted p-1">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "table"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No tokens matching &ldquo;{search}&rdquo;
        </p>
      ) : view === "grid" ? (
        <TokenGrid groups={filteredGroups} values={values} />
      ) : (
        <TokenTable groups={filteredGroups} values={values} />
      )}
    </div>
  );
}
