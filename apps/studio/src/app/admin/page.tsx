import * as React from 'react';
import Link from 'next/link';

export default function AdminPage(): React.JSX.Element {
  return (
    <main className="mx-auto max-w-3xl p-8 space-y-4">
      <h1 className="text-xl font-semibold">Admin</h1>
      <Link className="text-sm underline" href="/admin/releases">
        Releases — promote / rollback
      </Link>
    </main>
  );
}
