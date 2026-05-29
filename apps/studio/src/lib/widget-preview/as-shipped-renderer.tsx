'use client';
import * as React from 'react';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { useThemeOverrides } from '../theme-overrides-context';

export interface AsShippedRendererProps {
  definition: WidgetDefinition;
  config: Record<string, string>;
  dataThemeAttrs: Record<string, string>;
}

export function AsShippedRenderer({
  definition,
  config,
  dataThemeAttrs,
}: AsShippedRendererProps): React.JSX.Element {
  const target = React.useRef<HTMLDivElement | null>(null);
  const scriptId = `perimeter-widget-${definition.name}-script`;
  const cacheBustRef = React.useRef(0);
  const { overrides } = useThemeOverrides();
  const configKey = React.useMemo(() => JSON.stringify(config), [config]);
  const themeKey = React.useMemo(() => JSON.stringify(dataThemeAttrs), [dataThemeAttrs]);

  React.useEffect(() => {
    cacheBustRef.current += 1;
    const t = target.current;
    if (!t) return;

    // The runtime's autoMount sets a `__perimeterMounted` marker on the target;
    // we clear it so a fresh remount runs.
    delete (t as HTMLElement & { __perimeterMounted?: boolean }).__perimeterMounted;
    // Clear any prior shadow root content from a previous remount.
    if (t.shadowRoot)
      while (t.shadowRoot.firstChild) t.shadowRoot.removeChild(t.shadowRoot.firstChild);

    // Write attrs the bundle reads.
    t.setAttribute('data-perimeter-widget', definition.name);
    for (const [k, v] of Object.entries(dataThemeAttrs)) t.setAttribute(k, v);
    for (const [k, v] of Object.entries(config)) t.setAttribute(`data-${k}`, v);

    // (Re)load script.
    document.getElementById(scriptId)?.remove();
    const s = document.createElement('script');
    s.id = scriptId;
    s.src = `/widget-bundles/${definition.name}.js?v=${cacheBustRef.current}`;
    document.body.appendChild(s);

    return () => {
      document.getElementById(scriptId)?.remove();
      if (t.shadowRoot)
        while (t.shadowRoot.firstChild) t.shadowRoot.removeChild(t.shadowRoot.firstChild);
      t.removeAttribute('data-perimeter-widget');
    };
    // configKey/themeKey are derived from config/dataThemeAttrs and are stable per shape — see useMemo above.
  }, [definition.name, configKey, themeKey, scriptId]);

  React.useEffect(() => {
    const w = window as unknown as {
      PerimeterWidgets?: {
        applyOverrides: (name: string, overrides: Record<string, string>) => void;
      };
    };
    w.PerimeterWidgets?.applyOverrides(definition.name, overrides);
  }, [definition.name, overrides]);

  return <div ref={target} />;
}
