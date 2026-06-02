import { useEffect, useRef, useState } from 'react';
import { mount, type WidgetDefinition, type MountedWidget } from '@perimeter/widget-runtime';
import { ZodError } from 'zod';
import type { WidgetEntry } from '../lib/discovery';

/** Build a human-readable message from a mount error, naming the offending field for ZodErrors. */
function describeMountError(err: unknown): string {
  if (err instanceof ZodError) {
    return err.issues
      .map((i) => {
        const field = i.path.join('.') || '(root)';
        return `${field}: ${i.message}`;
      })
      .join('; ');
  }
  return err instanceof Error ? err.message : String(err);
}

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
  const [mountError, setMountError] = useState<string | null>(null);

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

  // (Re)mount when def/css/config change. Same mount() used in production —
  // mount() now re-validates configOverrides through the schema (parity with the
  // prod data-* gate), so invalid ConfigPanel input throws here. Surface it instead
  // of white-screening.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !def) return;
    try {
      handleRef.current = mount(host, def, css, { configOverrides });
      setMountError(null);
    } catch (err) {
      setMountError(describeMountError(err));
      return;
    }
    return () => {
      handleRef.current?.unmount();
      handleRef.current = null;
    };
  }, [def, css, configOverrides]);

  // Live token edits without a remount.
  useEffect(() => {
    handleRef.current?.updateTokens(tokenOverrides);
  }, [tokenOverrides]);

  if (mountError) {
    return (
      <div role="alert" data-perimeter-widget-error>
        <strong>Invalid widget config</strong>
        <p>{mountError}</p>
      </div>
    );
  }

  return <div ref={hostRef} data-perimeter-widget-preview />;
}
