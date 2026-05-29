'use client';
import * as React from 'react';
import { notFound } from 'next/navigation';
import { widgetDefinitions } from '../widget-definitions';
import { NativeRenderer } from './native-renderer';
import { AsShippedRenderer } from './as-shipped-renderer';

export interface WidgetPreviewProps {
  slug: string;
}

export function WidgetPreview({ slug }: WidgetPreviewProps): React.JSX.Element {
  const definition = widgetDefinitions[slug];
  if (!definition) notFound();
  const [mode, setMode] = React.useState<'native' | 'as-shipped'>('native');
  const [config, setConfig] = React.useState<Record<string, string>>({
    greeting: 'Hello',
    count: '3',
  });
  const [dataThemeAttrs, setDataThemeAttrs] = React.useState<Record<string, string>>({});

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <div className="rounded-md border border-border p-6 bg-bg">
        {mode === 'native' ? (
          <NativeRenderer definition={definition} config={config} dataThemeAttrs={dataThemeAttrs} />
        ) : (
          <AsShippedRenderer
            definition={definition}
            config={config}
            dataThemeAttrs={dataThemeAttrs}
          />
        )}
      </div>
      <div className="space-y-4">
        <div>
          <span className="text-sm font-medium">Render mode</span>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => setMode('native')}
              className={mode === 'native' ? 'underline' : ''}
            >
              Native
            </button>
            <button
              onClick={() => setMode('as-shipped')}
              className={mode === 'as-shipped' ? 'underline' : ''}
            >
              As shipped
            </button>
          </div>
        </div>
        <div>
          <span className="text-sm font-medium">Config (data-*)</span>
          {Object.entries(config).map(([k, v]) => (
            <div key={k} className="flex gap-2 mt-1">
              <code className="text-xs">data-{k}</code>
              <input
                value={v}
                onChange={(e) => setConfig({ ...config, [k]: e.target.value })}
                className="border px-1 text-xs"
              />
            </div>
          ))}
        </div>
        <div>
          <span className="text-sm font-medium">Theme override</span>
          <div className="flex gap-2 mt-1">
            <code className="text-xs">data-theme-color-primary</code>
            <input
              placeholder="hsl(...)"
              onChange={(e) =>
                setDataThemeAttrs({ ...dataThemeAttrs, 'data-theme-color-primary': e.target.value })
              }
              className="border px-1 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
