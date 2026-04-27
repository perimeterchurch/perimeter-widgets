// Shadow DOM
export { mountWidget } from './shadow-dom/mount';
export type { MountWidgetOptions, MountResult } from './shadow-dom/mount';

// Error Boundary
export { WidgetErrorBoundary } from './shadow-dom/error-boundary';

// API Client
export { createApiClient, resolveApiBaseUrl } from './api/client';
export type {
    WidgetApiClientOptions,
    paths,
    components,
    operations,
} from './api/client';

// API Error
export { createApiError } from './api/api-error';

// Auth
export { getMPToken, AuthProvider, useAuth } from './auth/mp-token';
export type { MPAuthState } from './auth/mp-token';

// Config
export { ConfigProvider, useConfig } from './shadow-dom/config';
export type { WidgetConfig } from './shadow-dom/config';

// Portal Container (shadow DOM)
export {
    PortalContainerProvider,
    usePortalContainer,
} from './shadow-dom/portal-container';

// React Query
export { createQueryClient } from './api/query-client';

// Formatting & sanitization helpers
export { formatDate } from './lib/format';
export { useSafeHtml } from './lib/use-safe-html';

// Components
export * from './components';
