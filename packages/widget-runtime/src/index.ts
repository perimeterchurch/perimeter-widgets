export {
  defineWidget,
  type DefineWidgetOptions,
  type WidgetDefinition,
  type AuthMode,
} from './define-widget';
export { mount, type MountExtras, type MountedWidget } from './mount';
export { autoMount, disposeAutoMount } from './auto-mount';
export { ensureGlobal, type PerimeterWidgetsGlobal } from './global';
export { useAuth } from './hooks/use-auth';
export { useApiClient } from './hooks/use-api-client';

/** @internal Test helpers. */
export { clearAll } from './registry';
export { clearStyleCache } from './styling';
