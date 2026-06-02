import { Component, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import type { ComponentEntry } from '../lib/discovery';
import { ComponentStage } from './ComponentStage';

/**
 * Isolates each previewed component. Many @perimeter/ui components require props
 * (Combobox, Pagination, SortSelect, Tabs, …) and throw when rendered bare; without
 * this boundary one throwing component would unmount the entire gallery view.
 */
class Isolate extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  override render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className="text-xs text-amber-600">
          Can&apos;t preview <code>{this.props.name}</code> standalone (it needs props).
        </div>
      );
    }
    return this.props.children;
  }
}

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
    <ComponentStage>
      <div className="flex flex-col gap-6 p-4">
        {components.map(([name, Comp]) => (
          <div key={name} className="rounded border p-4">
            <div className="mb-2 text-xs text-gray-500">{name}</div>
            <Isolate name={name}>
              <Comp />
            </Isolate>
          </div>
        ))}
      </div>
    </ComponentStage>
  );
}
