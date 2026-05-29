import * as React from 'react';
import Link from 'next/link';
import { componentEntries } from '@/lib/components-registry';

export default function ComponentsIndex(): React.JSX.Element {
  return (
    <main className="mx-auto max-w-3xl p-8 space-y-4">
      <h1 className="text-xl font-semibold">Components</h1>
      <ul className="space-y-1">
        {componentEntries.map((c) => (
          <li key={c.slug}>
            <Link href={`/components/${c.slug}`} className="text-primary underline">
              {c.title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
