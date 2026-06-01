import { useEffect, useRef, useState } from 'react';
import { mount, type WidgetDefinition, type MountedWidget } from '@perimeter/widget-runtime';
import type { WidgetEntry } from '../lib/discovery';

interface Props {
  entry: WidgetEntry;
  /** data-* config overrides from the ConfigPanel, keyed by camelCase. */
  configOverrides: Record<string, unknown>;
  /** runtime theme token overrides from the ThemeEditor. */
  tokenOverrides: Record<string, string>;
  /** Lets the parent (App) feed the loaded definition to the ConfigPanel. */
  onDefinition?: (def: WidgetDefinition) => void;
}

export function WidgetPreview({ entry, configOverrides, tokenOverrides, onDefinition }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<MountedWidget | null>(null);
  const [def, setDef] = useState<WidgetDefinition | null>(null);
  const [css, setCss] = useState<string>('');

  // Load the widget module + its css whenever the selected widget changes.
  useEffect(() => {
    let alive = true;
    void Promise.all([entry.load(), entry.loadCss()]).then(([m, c]) => {
      if (!alive) return;
      setDef(m.default);
      onDefinition?.(m.default);
      setCss(c.default ?? '');
    });
    return () => {
      alive = false;
    };
  }, [entry, onDefinition]);

  // (Re)mount when def/css/config change. Same mount() used in production.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !def) return;
    handleRef.current = mount(host, def, css, { configOverrides });
    return () => {
      handleRef.current?.unmount();
      handleRef.current = null;
    };
  }, [def, css, configOverrides]);

  // Live token edits without a remount.
  useEffect(() => {
    handleRef.current?.updateTokens(tokenOverrides);
  }, [tokenOverrides]);

  return <div ref={hostRef} data-perimeter-widget-preview />;
}
