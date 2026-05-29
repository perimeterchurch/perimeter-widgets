import * as React from 'react';
import Link from 'next/link';
import { widgetEntries } from '@/lib/widgets-registry';

export default function WidgetsIndex(): React.JSX.Element {
  return (
    <main className="mx-auto max-w-3xl p-8 space-y-4">
      <h1 className="text-xl font-semibold">Widgets</h1>
      <ul className="space-y-1">
        {widgetEntries.map((w) => (
          <li key={w.slug}>
            <Link href={`/widgets/${w.slug}`} className="text-primary underline">
              {w.title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
