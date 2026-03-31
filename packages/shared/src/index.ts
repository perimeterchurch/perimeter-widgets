// Shadow DOM
export { mountWidget } from './shadow-dom/mount';
export type { MountWidgetOptions, MountResult } from './shadow-dom/mount';

// API Client
export { createApiClient } from './api/client';
export type {
    WidgetApiClientOptions,
    paths,
    components,
    operations,
} from './api/client';

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

// Components
export * from './components';
