import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Release notes and updates for the Perimeter Style registry.",
  openGraph: {
    title: "Changelog — Perimeter Style",
    description: "Release notes and updates for the Perimeter Style registry.",
  },
};

interface ChangelogSection {
  version: string;
  date: string;
  categories: Record<string, string[]>;
}

function parseChangelog(content: string): ChangelogSection[] {
  const sections: ChangelogSection[] = [];
  let current: ChangelogSection | null = null;
  let currentCategory = "";

  for (const line of content.split("\n")) {
    const versionMatch = line.match(/^## \[(.+?)\](?:\s*-\s*(.+))?/);
    if (versionMatch) {
      if (current) sections.push(current);
      current = {
        version: versionMatch[1],
        date: versionMatch[2]?.trim() ?? "",
        categories: {},
      };
      continue;
    }

    const categoryMatch = line.match(/^### (.+)/);
    if (categoryMatch && current) {
      currentCategory = categoryMatch[1];
      current.categories[currentCategory] = [];
      continue;
    }

    const itemMatch = line.match(/^- (.+)/);
    if (itemMatch && current && currentCategory) {
      current.categories[currentCategory].push(itemMatch[1]);
    }
  }

  if (current) sections.push(current);
  return sections;
}

export default function ChangelogPage() {
  const raw = readFileSync(join(process.cwd(), "CHANGELOG.md"), "utf-8");
  const sections = parseChangelog(raw);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Changelog</h1>
        <p className="mt-1 text-muted-foreground">
          Release notes and updates for the Perimeter Style registry.
        </p>
      </div>

      {sections.map((section) => (
        <article key={section.version} className="space-y-4">
          <div className="flex items-baseline gap-3">
            <h2 className="text-xl font-semibold">{section.version}</h2>
            {section.date && (
              <span className="text-sm text-muted-foreground">
                {section.date}
              </span>
            )}
          </div>

          {Object.entries(section.categories).map(([category, items]) => (
            <div key={category}>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                {category}
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </article>
      ))}
    </div>
  );
}
