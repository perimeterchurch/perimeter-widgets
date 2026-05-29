import { useEffect, useState, type ComponentType, type CSSProperties } from 'react';
import { globalTokens, type ThemeToken } from '@perimeter/theme';
import type { ComponentEntry } from '../lib/discovery';

const tokenStyle = Object.fromEntries(
  (Object.keys(globalTokens) as ThemeToken[]).map((t) => [`--${t}`, globalTokens[t]]),
) as CSSProperties;

export function ComponentPreview({ entry }: { entry: ComponentEntry }) {
  const [exports, setExports] = useState<Record<string, unknown>>({});
  useEffect(() => {
    let alive = true;
    void entry.load().then((m) => {
      if (alive) setExports(m);
    });
    return () => {
      alive = false;
    };
  }, [entry]);

  const components = Object.entries(exports).filter(
    ([name, val]) => typeof val === 'function' && /^[A-Z]/.test(name),
  ) as [string, ComponentType][];

  return (
    <div style={tokenStyle} className="flex flex-col gap-6 p-4">
      {components.map(([name, Comp]) => (
        <div key={name} className="rounded border p-4">
          <div className="mb-2 text-xs text-gray-500">{name}</div>
          <Comp />
        </div>
      ))}
    </div>
  );
}
