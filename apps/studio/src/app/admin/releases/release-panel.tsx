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

// Compare two dotted versions left-to-right. Non-numeric segments (e.g.
// dev-build tails like `0.0.0-abc1234`) coerce to NaN; NaN diffs are falsy
// so they don't decide the result on their own — when only the trailing
// segments are non-numeric AND share the same numeric prefix, the function
// returns 0 (treated as "Promote"). A dev build vs a real release still
// orders correctly by the leading numeric segments.
function compareVersions(a: string, b: string): number {
  const as = a.split('.').map(Number);
  const bs = b.split('.').map(Number);
  const len = Math.max(as.length, bs.length);
  for (let i = 0; i < len; i++) {
    const diff = (as[i] ?? 0) - (bs[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

export function ReleasePanel({
  name,
  builds,
  latest,
  onPromote,
  onRollback,
}: Props): React.JSX.Element {
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
          const isRollback = latest !== null && compareVersions(b.version, latest) < 0;
          const handler = isRollback ? onRollback : onPromote;
          const label = isRollback ? `Roll back to ${b.version}` : `Promote ${b.version}`;
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
                    onClick={act(() => handler(name, b.version))}
                  >
                    {label}
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
