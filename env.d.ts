/// <reference types="vite/client" />

/**
 * Environment variable types for all packages.
 * Vite injects these at build time from .env files at the monorepo root.
 *
 * Naming convention: VITE_PW_<CATEGORY>_<NAME>
 *   PW = Perimeter Widgets
 *   Categories: API, AUTH, FEATURE, DEBUG
 */
interface ImportMetaEnv {
    // --- API ---
    /** Override API base URL (default: localhost:5500 in dev, api.perimeter.org in prod) */
    readonly VITE_PW_API_BASE_URL?: string;
    /** Storyboard only: "mock" (default) or "local" to skip MSW and hit real API */
    readonly VITE_PW_API_MODE?: 'mock' | 'local';

    // --- Vite built-ins ---
    readonly DEV: boolean;
    readonly PROD: boolean;
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

// Package subpath CSS inline imports
declare module '@perimeter-widgets/*/styles?inline' {
    const css: string;
    export default css;
}
