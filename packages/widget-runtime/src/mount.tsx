import { createRoot, type Root } from 'react-dom/client';
import { MPLocalStorageAuth, type AuthProvider } from '@perimeter/auth';
import { createApiClient } from '@perimeter/api-client';
import { resolveTokens } from '@perimeter/theme';
import type { z } from 'zod';
import type { WidgetDefinition } from './define-widget';
import { parseDataAttrs } from './data-attrs';
import { deregisterInstance, getCss, type InstanceHandle, registerInstance } from './registry';
import { AuthProviderProvider } from './providers/auth-provider';
import { AuthGate } from './providers/auth-gate';
import { ErrorBoundary } from './providers/error-boundary';
import { makeWidgetQueryClient, QueryProvider } from './providers/query-provider';
import { ApiClientContext } from './hooks/use-api-client';

const DEFAULT_API_URL =
  (typeof globalThis !== 'undefined' &&
    (globalThis as { __PERIMETER_API_URL__?: string }).__PERIMETER_API_URL__) ||
  'https://api.perimeter.org';

export interface MountOptions<S extends z.ZodTypeAny = z.ZodTypeAny> {
  definition: WidgetDefinition<S>;
  target: HTMLElement;
  configOverrides?: Record<string, unknown> | undefined;
  apiBaseUrl?: string | undefined;
  authFactory?: (() => AuthProvider) | undefined;
}

export interface MountedWidget extends InstanceHandle {
  unmount(): void;
}

/** AuthProvider implementations may optionally expose a dispose() to release listeners/timers. */
interface DisposableAuth {
  dispose?: () => void;
}

export function mountWidget<S extends z.ZodTypeAny>(opts: MountOptions<S>): MountedWidget {
  const { definition, target } = opts;

  const parsed = parseDataAttrs(target, definition.schema);
  const config = parsed.config as Record<string, unknown>;
  const dataAttrThemeOverrides = parsed.themeOverrides;
  const mergedConfig: Record<string, unknown> = { ...config, ...(opts.configOverrides ?? {}) };
  let runtimeOverrides: Record<string, string> = {};

  const shadow = target.shadowRoot ?? target.attachShadow({ mode: 'open' });
  // Clear any previous mount in this shadow root.
  while (shadow.firstChild) shadow.removeChild(shadow.firstChild);

  // The theme <style> lives OUTSIDE the React tree. Token updates rewrite its
  // textContent directly via applyCss(), avoiding a React re-render + the
  // flushSync-from-lifecycle warning that triggers when `updateTokens` is
  // called from inside a React effect (e.g. Studio's theme-overrides effect).
  const styleEl = document.createElement('style');
  styleEl.setAttribute('data-perimeter-theme', '');
  shadow.appendChild(styleEl);

  function buildCss(): string {
    const { cssText } = resolveTokens({
      widgetOverrides: definition.themeOverrides,
      dataAttrOverrides: dataAttrThemeOverrides,
      runtimeOverrides,
    });
    const widgetCss = getCss(definition.name) ?? '';
    return `${cssText}\n${widgetCss}`;
  }

  function applyCss(): void {
    styleEl.textContent = buildCss();
  }
  applyCss();

  const auth = (opts.authFactory ?? (() => new MPLocalStorageAuth()))();
  const apiClient = createApiClient({ baseUrl: opts.apiBaseUrl ?? DEFAULT_API_URL, auth });

  const reactRoot = document.createElement('div');
  shadow.appendChild(reactRoot);
  const root: Root = createRoot(reactRoot);
  const queryClient = makeWidgetQueryClient();
  const App = definition.App;

  root.render(
    <ErrorBoundary widgetName={definition.name}>
      <AuthProviderProvider value={auth}>
        <AuthGate widgetName={definition.name} mode={definition.auth}>
          <ApiClientContext.Provider value={apiClient}>
            <QueryProvider client={queryClient}>
              <App config={mergedConfig} auth={auth} />
            </QueryProvider>
          </ApiClientContext.Provider>
        </AuthGate>
      </AuthProviderProvider>
    </ErrorBoundary>,
  );

  const handle: MountedWidget = {
    unmount() {
      // Release auth listeners/timers BEFORE unmounting React, so any in-flight
      // onChange callback doesn't fire against a tree that's being torn down.
      (auth as DisposableAuth).dispose?.();
      root.unmount();
      while (shadow.firstChild) shadow.removeChild(shadow.firstChild);
      deregisterInstance(definition.name, handle);
    },
    updateTokens(overrides) {
      runtimeOverrides = overrides;
      // Direct DOM mutation — synchronous, no React re-render, no flushSync.
      // Studio's applyOverrides callers can read the new CSS variables
      // immediately after this call returns.
      applyCss();
    },
  };
  registerInstance(definition.name, handle);
  return handle;
}
