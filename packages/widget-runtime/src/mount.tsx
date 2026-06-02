import { createRoot, type Root } from 'react-dom/client';
import { MPLocalStorageAuth, type AuthProvider } from '@perimeter/auth';
import { createApiClient } from '@perimeter/api-client';
import { resolveTokens } from '@perimeter/theme';
import type { z } from 'zod';
import type { WidgetDefinition } from './define-widget';
import { parseDataAttrs, applyBoolShorthand } from './data-attrs';
import { applyStyles } from './styling';
import { deregisterInstance, registerInstance, type InstanceHandle } from './registry';
import { AuthProviderProvider } from './providers/auth-provider';
import { AuthGate } from './providers/auth-gate';
import { ErrorBoundary } from './providers/error-boundary';
import { makeWidgetQueryClient, QueryProvider } from './providers/query-provider';
import { ApiClientContext } from './hooks/use-api-client';

const DEFAULT_API_URL =
  (typeof globalThis !== 'undefined' &&
    (globalThis as { __PERIMETER_API_URL__?: string }).__PERIMETER_API_URL__) ||
  'https://api.perimeter.org';

/** Optional, rarely-needed mount inputs (the old options object, minus definition/target). */
export interface MountExtras {
  configOverrides?: Record<string, unknown> | undefined;
  apiBaseUrl?: string | undefined;
  authFactory?: (() => AuthProvider) | undefined;
}

export interface MountedWidget extends InstanceHandle {
  unmount(): void;
}

interface DisposableAuth {
  dispose?: () => void;
}

/**
 * The single render path. Used identically by the production IIFE (via autoMount)
 * and the studio dev harness. `css` is the widget's compiled Tailwind output,
 * imported as a `?inline` string — the same string in dev and prod.
 */
export function mount<S extends z.ZodTypeAny>(
  host: HTMLElement,
  definition: WidgetDefinition<S>,
  css: string,
  extras: MountExtras = {},
): MountedWidget {
  const parsed = parseDataAttrs(host, definition.schema);
  const dataAttrThemeOverrides = parsed.themeOverrides;
  // Studio `configOverrides` must clear the exact gates prod `data-*` attrs clear:
  // the `"true"/"false"`→bool shorthand (which zod cannot replicate —
  // `z.coerce.boolean()('false') === true`) and then full coercion/bounds/refinements
  // via `schema.parse`. With no overrides this re-parses the already-parsed config
  // (idempotent for this repo's schemas).
  const overrides = Object.fromEntries(
    Object.entries(extras.configOverrides ?? {}).map(([k, v]) => [k, applyBoolShorthand(v)]),
  );
  const mergedConfig: Record<string, unknown> = definition.schema.parse({
    ...(parsed.config as Record<string, unknown>),
    ...overrides,
  }) as Record<string, unknown>;
  let runtimeOverrides: Partial<Record<string, string>> = {};

  function tokenCss(): string {
    return resolveTokens({
      widgetOverrides: definition.themeOverrides,
      dataAttrOverrides: dataAttrThemeOverrides,
      runtimeOverrides,
    }).cssText;
  }

  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  while (shadow.firstChild) shadow.removeChild(shadow.firstChild);

  const styles = applyStyles(shadow, definition.name, css, tokenCss());

  const auth = (extras.authFactory ?? (() => new MPLocalStorageAuth()))();
  const apiClient = createApiClient({ baseUrl: extras.apiBaseUrl ?? DEFAULT_API_URL, auth });

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
      (auth as DisposableAuth).dispose?.();
      root.unmount();
      styles.dispose();
      while (shadow.firstChild) shadow.removeChild(shadow.firstChild);
      deregisterInstance(definition.name, handle);
    },
    updateTokens(overrides) {
      runtimeOverrides = overrides;
      // Swap only the token layer; shared widget styles + React tree untouched.
      styles.update(tokenCss());
    },
  };
  registerInstance(definition.name, handle);
  return handle;
}
