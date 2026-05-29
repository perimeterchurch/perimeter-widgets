import * as React from 'react';
import Link from 'next/link';

export default function Page(): React.JSX.Element {
  return (
    <main className="mx-auto max-w-3xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Perimeter Widgets Studio</h1>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <Link href="/components" className="text-primary underline">
            Components
          </Link>
        </li>
        <li>
          <Link href="/widgets" className="text-primary underline">
            Widgets
          </Link>
        </li>
        <li>
          <Link href="/theme" className="text-primary underline">
            Theme editor
          </Link>
        </li>
        <li>
          <Link href="/admin" className="text-muted-fg">
            Admin (Phase 3)
          </Link>
        </li>
      </ul>
    </main>
  );
}
