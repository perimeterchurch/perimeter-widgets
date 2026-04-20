import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { CopyInstallButton } from "@/components/site/copy-install-button";
import { highlight } from "@/lib/highlight";
import manifest from "@/lib/demo-manifest.json";
import { TEMPLATE_ENTRIES, TEMPLATE_SLUGS } from "@/templates";

import { TemplateDetailClient } from "./template-detail-client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = TEMPLATE_ENTRIES.find((e) => e.slug === slug);
  const name = entry?.meta.name ?? slug;
  const description =
    entry?.meta.description ?? `${name} template from Perimeter Style.`;
  return {
    title: name,
    description,
    openGraph: {
      title: `${name} — Perimeter Style`,
      description,
    },
  };
}

export function generateStaticParams() {
  return TEMPLATE_SLUGS.map((slug) => ({ slug }));
}

async function readTemplateSource(slug: string): Promise<string> {
  const filePath = join(process.cwd(), "src", "templates", `${slug}.tsx`);
  return readFile(filePath, "utf-8");
}

export default async function TemplateDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const entry = TEMPLATE_ENTRIES.find((e) => e.slug === slug);
  if (!entry) notFound();

  const { slug: templateSlug, meta } = entry;

  const sourceCode = await readTemplateSource(templateSlug);
  const codeHtml = await highlight(sourceCode);

  const installParts = meta.components.map((c) => `@perimeter/${c}`);
  const installCommand = `pnpm dlx shadcn@latest add ${installParts.join(" ")}`;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">{meta.name}</h1>
        <p className="mt-1 text-muted-foreground">{meta.description}</p>
      </div>

      {/* Component list */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Components used:
        </span>
        {meta.components.map((comp) => {
          const entry = manifest.find((e) => e.slug === comp);
          const href = entry
            ? `/components/${entry.category}/${comp}`
            : "/components";
          return (
            <Link key={comp} href={href}>
              <Badge variant="secondary">{comp}</Badge>
            </Link>
          );
        })}
      </div>

      {/* Install command */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Install Components</h2>
        <CopyInstallButton command={installCommand} />
      </section>

      {/* Preview / Code toggle */}
      <TemplateDetailClient
        slug={templateSlug}
        codeHtml={codeHtml}
        rawCode={sourceCode}
      />
    </div>
  );
}
