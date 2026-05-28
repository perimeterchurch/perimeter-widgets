'use client';
import * as React from 'react';
import type { BuildRecord } from '@perimeter/release-store';

type Props = {
  name: string;
  builds: BuildRecord[];
  latest: string | null;
  onPromote: (name: string, version: string) => Promise<void>;
  onRollback: (name: string, version: string) => Promise<void>;
};

export function ReleasePanel({ name, builds, latest, onPromote, onRollback: _onRollback }: Props): React.JSX.Element {
  const [pending, setPending] = React.useState(false);
  const act = (fn: () => Promise<void>) => () => {
    setPending(true);
    void fn().finally(() => setPending(false));
  };

  return (
    <section className="space-y-2">
      <h2 className="font-medium">{name}</h2>
      <ul className="divide-y divide-border">
        {builds.map((b) => {
          const live = b.version === latest;
          return (
            <li key={b.version} className="flex items-center gap-3 py-2 text-sm">
              <span className="font-mono">{b.version}</span>
              <span className="text-muted-fg">{(b.sizeGz / 1024).toFixed(1)} KB gz</span>
              <span className="text-muted-fg font-mono">{b.sha}</span>
              {live && <span className="rounded bg-fg px-1.5 text-xs text-bg">LATEST</span>}
              <span className="ml-auto">
                {live ? null : (
                  <button
                    disabled={pending}
                    className="rounded-md border border-border px-2 py-1 text-xs"
                    onClick={act(() => onPromote(name, b.version))}
                  >
                    {`Promote ${b.version}`}
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
