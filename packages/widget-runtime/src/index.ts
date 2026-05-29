export {
  defineWidget,
  type DefineWidgetOptions,
  type WidgetDefinition,
  type AuthMode,
} from './define-widget';
export { mountWidget, type MountOptions, type MountedWidget } from './mount';
export { nativeRender } from './native-render';
export { autoMount } from './auto-mount';
export { ensureGlobal, type PerimeterWidgetsGlobal } from './global';
export { registerCss, getCss } from './registry';
export { useAuth } from './hooks/use-auth';
export { useApiClient } from './hooks/use-api-client';

/**
 * @internal Test helpers — not part of the supported public API.
 * Used by Studio's acceptance tests to reset registry state and
 * tear down MutationObservers between tests.
 */
export { clearAll } from './registry';
/** @internal Test helper — see clearAll. */
export { disposeAutoMount } from './auto-mount';
