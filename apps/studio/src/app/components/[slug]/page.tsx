import * as React from 'react';
import { notFound } from 'next/navigation';
import { componentEntries } from '@/lib/components-registry';
import { PreviewSlot } from './preview-slot';

export function generateStaticParams(): { slug: string }[] {
  return componentEntries.map((c) => ({ slug: c.slug }));
}

export default async function ComponentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const entry = componentEntries.find((c) => c.slug === slug);
  if (!entry) notFound();
  return (
    <main className="mx-auto max-w-3xl p-8 space-y-6">
      <h1 className="text-xl font-semibold">{entry.title}</h1>
      <code className="text-sm text-muted-fg">{entry.importPath}</code>
      <div className="rounded-md border border-border p-6 bg-bg">
        <PreviewSlot slug={slug} />
      </div>
    </main>
  );
}
