import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
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
import { ThemeProvider } from './providers/theme-provider';
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

  function buildCss(): string {
    const { cssText } = resolveTokens({
      widgetOverrides: definition.themeOverrides,
      dataAttrOverrides: dataAttrThemeOverrides,
      runtimeOverrides,
    });
    const widgetCss = getCss(definition.name) ?? '';
    return `${cssText}\n${widgetCss}`;
  }

  const auth = (opts.authFactory ?? (() => new MPLocalStorageAuth()))();
  const apiClient = createApiClient({ baseUrl: opts.apiBaseUrl ?? DEFAULT_API_URL, auth });

  const reactRoot = document.createElement('div');
  shadow.appendChild(reactRoot);
  const root: Root = createRoot(reactRoot);
  const queryClient = makeWidgetQueryClient();
  const App = definition.App;

  function render(): void {
    root.render(
      <ErrorBoundary widgetName={definition.name}>
        <ThemeProvider cssText={buildCss()}>
          <AuthProviderProvider value={auth}>
            <AuthGate widgetName={definition.name} mode={definition.auth}>
              <ApiClientContext.Provider value={apiClient}>
                <QueryProvider client={queryClient}>
                  <App config={mergedConfig} auth={auth} />
                </QueryProvider>
              </ApiClientContext.Provider>
            </AuthGate>
          </AuthProviderProvider>
        </ThemeProvider>
      </ErrorBoundary>,
    );
  }

  const handle: MountedWidget = {
    unmount() {
      root.unmount();
      while (shadow.firstChild) shadow.removeChild(shadow.firstChild);
      // Release any listeners/timers held by the AuthProvider (e.g. MPLocalStorageAuth's
      // window 'storage' listener and setInterval). Optional so this runtime works with
      // any AuthProvider impl, gracefully no-op if the impl doesn't expose dispose().
      (auth as DisposableAuth).dispose?.();
      deregisterInstance(definition.name, handle);
    },
    updateTokens(overrides) {
      runtimeOverrides = overrides;
      // applyOverrides callers (e.g. Studio) expect to read the updated CSS variables
      // synchronously after the call returns, so flush the React update immediately.
      flushSync(() => {
        render();
      });
    },
  };
  registerInstance(definition.name, handle);
  render();
  return handle;
}
