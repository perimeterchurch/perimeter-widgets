import { useEffect, useRef, useState } from 'react';
import { mount, type WidgetDefinition, type MountedWidget } from '@perimeter/widget-runtime';
import { ZodError } from 'zod';
import type { WidgetEntry } from '../lib/discovery';
import { useImpersonation } from '../lib/impersonation-context';

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
  /**
   * Light/dark preview theme. 'dark' sets `data-theme="dark"` on the shadow host
   * (the `[data-perimeter-widget-preview]` div), which is what
   * `:host([data-theme="dark"])` matches — so the dark token block activates.
   * Defaults to 'light' (attribute removed).
   */
  theme?: 'light' | 'dark';
  /** Lets the parent (App) feed the loaded definition to the ConfigPanel. */
  onDefinition?: (def: WidgetDefinition) => void;
}

export function WidgetPreview({
  entry,
  configOverrides,
  tokenOverrides,
  theme = 'light',
  onDefinition,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<MountedWidget | null>(null);
  const [def, setDef] = useState<WidgetDefinition | null>(null);
  const [css, setCss] = useState<string>('');
  const [mountError, setMountError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load the widget module + its css whenever the selected widget changes. A
  // rejected dynamic import (bad chunk, renamed entry, network blip) never
  // reaches the runtime ErrorBoundary — that only catches RENDER crashes of an
  // already-mounted widget — so surface the load failure here as a distinct
  // canvas state rather than a silent blank frame.
  useEffect(() => {
    let alive = true;
    setLoadError(null);
    void Promise.all([entry.load(), entry.loadCss()])
      .then(([m, c]) => {
        if (!alive) return;
        setDef(m.default);
        onDefinition?.(m.default);
        setCss(c.default ?? '');
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      alive = false;
    };
  }, [entry, onDefinition]);

  // While impersonating (admin-only, behind the shell) route the widget's API
  // calls through the shell proxy so they resolve on behalf of the target. Null
  // target → normal behavior (and a safe default without the provider, e.g. in
  // tests).
  const { targetUserId } = useImpersonation();

  // (Re)mount when def/css/config/impersonation change. Same mount() used in
  // production — mount() now re-validates configOverrides through the schema
  // (parity with the prod data-* gate), so invalid ConfigPanel input throws
  // here. Surface it instead of white-screening.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !def) return;
    try {
      // DATA/hooks knob. Impersonation wins: point the runtime API client at the
      // shell proxy (/api/impersonate/data) so hooks fetch the target's data.
      // Otherwise in dev point at the local perimeter-api (localhost:5500); left
      // undefined in the deployed, non-impersonating build so prod uses
      // DEFAULT_API_URL. Independent of the images knob (VITE_API_URL → format.ts).
      const apiBaseUrl =
        targetUserId != null
          ? `${window.location.origin}/api/impersonate/data`
          : import.meta.env.DEV
            ? 'http://localhost:5500'
            : undefined;
      handleRef.current = mount(host, def, css, { configOverrides, apiBaseUrl });
      setMountError(null);
    } catch (err) {
      setMountError(describeMountError(err));
      return;
    }
    return () => {
      handleRef.current?.unmount();
      handleRef.current = null;
    };
  }, [def, css, configOverrides, targetUserId]);

  // Live token edits without a remount.
  useEffect(() => {
    handleRef.current?.updateTokens(tokenOverrides);
  }, [tokenOverrides]);

  // Light/dark toggle: set `data-theme="dark"` directly on the shadow host so
  // `:host([data-theme="dark"])` (emitted by resolveTokens) activates the dark
  // token block — exactly how a production embed activates dark mode. This is the
  // host div itself (NOT the HostFrame wrapper); :host() only matches the shadow
  // host. Setting it while the host is `hidden` on a mount error is harmless.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (theme === 'dark') host.setAttribute('data-theme', 'dark');
    else host.removeAttribute('data-theme');
  }, [theme]);

  // Keep the host div mounted at all times so hostRef stays attached to the DOM.
  // If we returned the alert *instead* of the host, hostRef.current would become
  // null and the mount effect would bail at `if (!host || !def) return` forever —
  // the preview could never re-mount or clear the error on corrected input.
  // Hide the host (rather than unmount it) while an error is shown.
  return (
    <>
      {loadError && (
        <div
          role="alert"
          data-perimeter-widget-load-error
          className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-fg"
        >
          <strong className="block font-semibold">Widget failed to load</strong>
          <p className="mt-1 text-muted-fg">
            The widget module could not be loaded. This is a load/build error, not a render crash —
            check the entry and rebuild.
          </p>
          <p className="mt-2 font-mono text-xs text-muted-fg">{loadError}</p>
        </div>
      )}
      {mountError && (
        <div role="alert" data-perimeter-widget-error>
          <strong>Invalid widget config</strong>
          <p>{mountError}</p>
        </div>
      )}
      <div
        ref={hostRef}
        data-perimeter-widget-preview
        hidden={mountError !== null || loadError !== null}
      />
    </>
  );
}
