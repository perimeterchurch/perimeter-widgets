import * as React from 'react';
import { notFound } from 'next/navigation';
import { widgetEntries } from '@/lib/widgets-registry';
import { WidgetPreview } from '@/lib/widget-preview/widget-preview';

export function generateStaticParams(): { slug: string }[] {
  return widgetEntries.map((w) => ({ slug: w.slug }));
}

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const entry = widgetEntries.find((w) => w.slug === slug);
  if (!entry) notFound();
  return (
    <main className="mx-auto max-w-5xl p-8 space-y-6">
      <h1 className="text-xl font-semibold">{entry.title}</h1>
      <WidgetPreview slug={entry.slug} />
    </main>
  );
}
