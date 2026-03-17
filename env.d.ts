/// <reference types="vite/client" />

/**
 * Shared environment variable types for all packages.
 * Vite injects these at build time from .env files at the monorepo root.
 *
 * Available variables:
 *   VITE_API_URL    - Override API base URL (default: localhost:5500 in dev, api.perimeter.org in prod)
 *   VITE_API_MODE   - "mock" (default) uses MSW mocks in storyboard, "local" hits real API
 */
interface ImportMetaEnv {
    /** Override API base URL for all widgets */
    readonly VITE_API_URL?: string;
    /** Storyboard only: "mock" (default) or "local" to skip MSW */
    readonly VITE_API_MODE?: 'mock' | 'local';
    /** Vite built-in: true in dev server */
    readonly DEV: boolean;
    /** Vite built-in: true in production build */
    readonly PROD: boolean;
    /** Vite built-in: "development" or "production" */
    readonly MODE: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// CSS inline imports (Vite ?inline query)
declare module '*.css?inline' {
    const css: string;
    export default css;
}

// Package subpath CSS inline imports (e.g., @perimeter-widgets/widget-sermons/styles?inline)
declare module '@perimeter-widgets/*/styles?inline' {
    const css: string;
    export default css;
}
