import * as React from 'react';
import { releaseStore } from '@/lib/release-store';

export const dynamic = 'force-dynamic';
import { promote, rollback } from './actions';
import { ReleasePanel } from './release-panel';

export default async function ReleasesPage(): Promise<React.JSX.Element> {
  const store = releaseStore();
  const widgets = await store.listWidgets();
  // Include widgets that have builds but were never promoted, too.
  const names = Array.from(new Set([...widgets, 'sermons']));
  const panels = await Promise.all(
    names.map(async (name) => ({
      name,
      builds: await store.listBuilds(name),
      latest: await store.getLatest(name),
    })),
  );
  const activity = await store.listActivity();

  return (
    <main className="mx-auto max-w-3xl p-8 space-y-8">
      <h1 className="text-xl font-semibold">Releases</h1>
      {panels
        .filter((p) => p.builds.length > 0)
        .map((p) => (
          <ReleasePanel
            key={p.name}
            name={p.name}
            builds={p.builds}
            latest={p.latest}
            onPromote={promote}
            onRollback={rollback}
          />
        ))}
      <section className="space-y-2">
        <h2 className="font-medium">Activity</h2>
        <ul className="space-y-1 text-sm text-muted-fg">
          {activity.map((a, i) => (
            <li key={i} className="font-mono">
              {a.at} · {a.action} {a.widget}@{a.version} · {a.by}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
