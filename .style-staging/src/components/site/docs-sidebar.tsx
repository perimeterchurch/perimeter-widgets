"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import manifest from "@/lib/demo-manifest.json";
import { groupByCategory, type ManifestEntry } from "@/lib/demo-types";

export function DocsSidebar() {
  const pathname = usePathname();
  const categories = groupByCategory(manifest as ManifestEntry[]);

  return (
    <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r p-4">
      <nav className="space-y-4">
        <div>
          <h3 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Getting Started
          </h3>
          <Link
            href="/docs/getting-started"
            className={cn(
              "block rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted",
              pathname === "/docs/getting-started"
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            Introduction
          </Link>
          <Link
            href="/docs/theming"
            className={cn(
              "block rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted",
              pathname === "/docs/theming"
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            Theming
          </Link>
          <Link
            href="/docs/contributing"
            className={cn(
              "block rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted",
              pathname === "/docs/contributing"
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            Contributing
          </Link>
          <Link
            href="/docs/troubleshooting"
            className={cn(
              "block rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted",
              pathname === "/docs/troubleshooting"
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            Troubleshooting
          </Link>
        </div>

        {categories.map(([category, entries]) => (
          <div key={category}>
            <Link
              href={`/components/${category}`}
              className={cn(
                "mb-1 block px-2 text-xs font-semibold uppercase tracking-wider transition-colors hover:text-foreground",
                pathname === `/components/${category}`
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {category}
            </Link>
            <ul className="space-y-0.5">
              {entries.map((entry) => {
                const href = `/components/${category}/${entry.slug}`;
                return (
                  <li key={entry.slug}>
                    <Link
                      href={href}
                      className={cn(
                        "block rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted",
                        pathname === href
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {entry.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
