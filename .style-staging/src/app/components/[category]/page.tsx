import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import manifest from "@/lib/demo-manifest.json";
import { capitalize, type ManifestEntry } from "@/lib/demo-types";

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { category } = await params;
  const title = capitalize(category);
  return {
    title,
    description: `${title} components in the Perimeter Style registry.`,
    openGraph: {
      title: `${title} — Perimeter Style`,
      description: `${title} components in the Perimeter Style registry.`,
    },
  };
}

function uniqueCategories(entries: ManifestEntry[]): string[] {
  return [...new Set(entries.map((e) => e.category))];
}

export function generateStaticParams() {
  return uniqueCategories(manifest as ManifestEntry[]).map((category) => ({
    category,
  }));
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;

  const components = (manifest as ManifestEntry[]).filter(
    (e) => e.category === category,
  );
  if (components.length === 0) notFound();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{capitalize(category)}</h1>
        <p className="mt-1 text-muted-foreground">
          {components.length}{" "}
          {components.length === 1 ? "component" : "components"} in this
          category.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {components.map((entry) => (
          <Link
            key={entry.slug}
            href={`/components/${category}/${entry.slug}`}
            className="group rounded-lg border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/50"
          >
            <h2 className="font-semibold group-hover:text-primary">
              {entry.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {entry.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
