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
 * The live handle per host element. mount() on an already-mounted host must
 * dispose the previous instance first — clearing the shadow DOM alone leaves
 * the old React tree rendering into detached nodes, the QueryClient's timers
 * running, and the auth provider's 1s localStorage poll alive forever.
 */
const liveHandles = new WeakMap<HTMLElement, MountedWidget>();

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
  // Re-mount: dispose the previous instance before building the new one.
  liveHandles.get(host)?.unmount();

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
  // Base-URL precedence: programmatic extras > the widget's documented
  // `data-api-url` attribute (parsed into config as `apiUrl`) > default.
  // Without the config hop, `data-api-url` only affected <img> URLs while
  // React Query data silently kept coming from prod.
  const configApiUrl =
    typeof mergedConfig.apiUrl === 'string' && mergedConfig.apiUrl
      ? mergedConfig.apiUrl
      : undefined;
  const apiClient = createApiClient({
    baseUrl: extras.apiBaseUrl ?? configApiUrl ?? DEFAULT_API_URL,
    auth,
  });

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

  let unmounted = false;
  const handle: MountedWidget = {
    // Idempotent: both a host-page caller and the runtime's own re-mount /
    // removal cleanup may race to dispose the same instance.
    unmount() {
      if (unmounted) return;
      unmounted = true;
      if (liveHandles.get(host) === handle) liveHandles.delete(host);
      (auth as DisposableAuth).dispose?.();
      // Defer the React root teardown to a microtask. Calling root.unmount()
      // synchronously while a parent React tree is rendering/committing — a studio
      // re-mount on a dep change, or an RTL/test unmount — triggers React 19's
      // "Attempted to synchronously unmount a root while React was already
      // rendering" warning and an intermittent teardown race. The shadow is cleared
      // synchronously below so a re-mount on the same host starts clean (mount()
      // re-clears too); the deferred unmount then tears down the now-detached old
      // fiber tree after the current commit completes.
      queueMicrotask(() => root.unmount());
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
  liveHandles.set(host, handle);
  return handle;
}
