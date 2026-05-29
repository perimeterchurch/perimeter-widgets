import { useMemo, useState } from 'react';
import {
  toWidgetEntries,
  toComponentEntries,
  widgetDefGlob,
  widgetCssGlob,
  componentGlob,
} from './lib/discovery';
import { WidgetPreview } from './components/WidgetPreview';
import { ComponentPreview } from './components/ComponentPreview';
import { ThemeEditor } from './components/ThemeEditor';
import { ConfigPanel } from './components/ConfigPanel';
import type { WidgetDefinition } from '@perimeter/widget-runtime';

type Selection = { kind: 'widget'; slug: string } | { kind: 'component'; name: string } | null;

export function App() {
  const widgets = useMemo(() => toWidgetEntries(widgetDefGlob, widgetCssGlob), []);
  const components = useMemo(() => toComponentEntries(componentGlob), []);
  const [selection, setSelection] = useState<Selection>(
    widgets[0] ? { kind: 'widget', slug: widgets[0].slug } : null,
  );
  const [configOverrides, setConfigOverrides] = useState<Record<string, unknown>>({});
  const [tokenOverrides, setTokenOverrides] = useState<Record<string, string>>({});
  const [def, setDef] = useState<WidgetDefinition | null>(null);

  const widget =
    selection?.kind === 'widget' ? widgets.find((w) => w.slug === selection.slug) : undefined;
  const component =
    selection?.kind === 'component' ? components.find((c) => c.name === selection.name) : undefined;

  return (
    <div className="grid h-screen grid-cols-[16rem_1fr_18rem] font-sans">
      <nav className="overflow-y-auto border-r p-3 text-sm">
        <h2 className="mb-1 font-semibold">Widgets</h2>
        {widgets.map((w) => (
          <button
            key={w.slug}
            className="block w-full text-left hover:underline"
            onClick={() => {
              setSelection({ kind: 'widget', slug: w.slug });
              setConfigOverrides({});
            }}
          >
            {w.slug}
          </button>
        ))}
        <h2 className="mb-1 mt-4 font-semibold">Components</h2>
        {components.map((c) => (
          <button
            key={c.name}
            className="block w-full text-left hover:underline"
            onClick={() => setSelection({ kind: 'component', name: c.name })}
          >
            {c.name}
          </button>
        ))}
      </nav>

      <main className="overflow-auto bg-gray-50 p-6">
        {widget && (
          <>
            <WidgetPreview
              entry={widget}
              configOverrides={configOverrides}
              tokenOverrides={tokenOverrides}
              onDefinition={setDef}
            />
            <pre className="mt-6 rounded bg-gray-900 p-3 text-xs text-gray-100">{`<div data-perimeter-widget="${widget.slug}"></div>
<script src="https://widgets.perimeter.org/${widget.slug}/latest.js" async></script>`}</pre>
          </>
        )}
        {component && <ComponentPreview entry={component} />}
      </main>

      <aside className="overflow-y-auto border-l">
        {widget && def && (
          <ConfigPanel definition={def} overrides={configOverrides} onChange={setConfigOverrides} />
        )}
        {widget && <ThemeEditor overrides={tokenOverrides} onChange={setTokenOverrides} />}
      </aside>
    </div>
  );
}
