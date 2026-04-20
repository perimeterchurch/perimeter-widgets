import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TEMPLATE_ENTRIES } from "@/templates";
import { CodeBlock } from "@/components/site/code-block";
import { ComponentPlayground } from "@/components/site/component-playground";
import { CopyInstallButton } from "@/components/site/copy-install-button";
import { ExampleCard } from "@/components/site/example-card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { buildSnippet } from "@/lib/build-snippet";
import { extractExampleSources } from "@/lib/extract-source";
import { highlight } from "@/lib/highlight";
import { demoImports } from "@/lib/demo-imports";
import manifest from "@/lib/demo-manifest.json";

import type { DemoExample } from "@/lib/demo-types";

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = manifest.find((e) => e.slug === slug);
  const name = entry?.name ?? slug;
  const description =
    entry?.description ??
    `${name} component from the Perimeter Style registry.`;
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
  return manifest.map((entry) => ({
    category: entry.category,
    slug: entry.slug,
  }));
}

export default async function ComponentPage({ params }: PageProps) {
  const { category, slug } = await params;

  const entry = manifest.find(
    (e) => e.category === category && e.slug === slug,
  );
  if (!entry) notFound();

  const importFn = demoImports[slug];
  if (!importFn) notFound();

  const demoModule = await importFn();
  const { controls, examples, meta } = demoModule;

  const playgroundCode = buildSnippet(meta.name, controls);
  const defaultCodeHtml = await highlight(playgroundCode);

  const usedInTemplates = TEMPLATE_ENTRIES.filter((t) =>
    t.meta.components.includes(slug),
  );

  const importName = meta.name.replace(/\s+/g, "");
  const usageCode = `import { ${importName} } from "@/components/ui/${slug}";\n\n${playgroundCode}`;
  const usageCodeHtml = await highlight(usageCode);

  const exampleSources = await extractExampleSources(slug);

  const highlightedExamples = await Promise.all(
    exampleSources.map((src) => highlight(src)),
  );

  return (
    <div className="space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/components" />}>
              Components
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={`/components/${category}`} />}>
              {category}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{meta.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold">{meta.name}</h1>
        <p className="mt-1 text-muted-foreground">{meta.description}</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Usage</h2>
        <CodeBlock html={usageCodeHtml} rawCode={usageCode} language="tsx" />
      </section>

      <ComponentPlayground
        slug={slug}
        controls={controls}
        componentName={meta.name}
        defaultCodeHtml={defaultCodeHtml}
        defaultCodeRaw={playgroundCode}
      />

      {examples.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Examples</h2>
          {examples.map((example: DemoExample, i: number) => (
            <ExampleCard
              key={example.name}
              name={example.name}
              codeHtml={highlightedExamples[i] ?? ""}
              rawCode={exampleSources[i] ?? ""}
            >
              {example.render()}
            </ExampleCard>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Installation</h2>
        <CopyInstallButton command={meta.install} />
      </section>

      {usedInTemplates.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Used in Templates</h2>
          <div className="flex flex-wrap gap-2">
            {usedInTemplates.map((t) => (
              <Link key={t.slug} href={`/templates/${t.slug}`}>
                <Badge variant="secondary">{t.meta.name}</Badge>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
