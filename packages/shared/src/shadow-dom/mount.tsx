import { type ComponentType, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '../api/query-client';
import { AuthProvider } from '../auth/mp-token';
import {
    ConfigProvider,
    parseDataAttributes,
    type WidgetConfig,
} from './config';
import { PortalContainerProvider } from './portal-container';

export interface MountWidgetOptions {
    /** ID of the target DOM element (e.g., 'perimeter-sermons') */
    elementId: string;
    /** Root React component to render (must accept no props) */
    component: ComponentType;
    /** Compiled CSS string to inject into the shadow root */
    styles: string;
    /** Default config values (overridden by data-* attributes) */
    defaults?: WidgetConfig;
    /** Whether this widget requires authentication */
    requiresAuth?: boolean;
}

export interface MountResult {
    destroy: () => void;
}

// Track React roots per element for graceful cleanup on re-mount
const activeRoots = new WeakMap<Element, Root>();

export function mountWidget(options: MountWidgetOptions): MountResult | null {
    const {
        elementId,
        component: Component,
        styles,
        defaults = {},
        requiresAuth = false,
    } = options;

    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(
            `[perimeter-widgets] Target element #${elementId} not found`,
        );
        return null;
    }

    // Unmount any existing React root before re-mounting (handles HMR/re-mount)
    const existingRoot = activeRoots.get(element);
    if (existingRoot) {
        existingRoot.unmount();
        activeRoots.delete(element);
    }

    // Reuse existing shadow root or create new one
    const shadowRoot =
        element.shadowRoot || element.attachShadow({ mode: 'open' });

    // Clear previous content (placeholder HTML or previous widget mount)
    shadowRoot.innerHTML = '';

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    shadowRoot.appendChild(styleEl);

    // Create mount point inside shadow root
    const mountPoint = document.createElement('div');
    mountPoint.id = 'widget-root';

    // Propagate data-theme for dark mode support
    const theme = element.getAttribute('data-theme');
    if (theme) {
        // Host: so :host([data-theme="dark"]) swaps CSS custom property values
        shadowRoot.host.setAttribute('data-theme', theme);
        // Inner div: so @custom-variant dark selector activates dark: Tailwind utilities
        mountPoint.setAttribute('data-theme', theme);
    }

    shadowRoot.appendChild(mountPoint);

    // Parse config from data attributes
    const dataConfig = parseDataAttributes(element);
    const config = { ...defaults, ...dataConfig };

    // Create isolated QueryClient
    const queryClient = createQueryClient();

    // Mount React
    let root: Root | null = createRoot(mountPoint);
    activeRoots.set(element, root);

    root.render(
        <StrictMode>
            <PortalContainerProvider container={mountPoint}>
                <QueryClientProvider client={queryClient}>
                    <AuthProvider requiresAuth={requiresAuth}>
                        <ConfigProvider config={config}>
                            <Component />
                        </ConfigProvider>
                    </AuthProvider>
                </QueryClientProvider>
            </PortalContainerProvider>
        </StrictMode>,
    );

    return {
        destroy: () => {
            if (root) {
                activeRoots.delete(element);
                root.unmount();
                root = null;
                queryClient.clear();
            }
        },
    };
}
