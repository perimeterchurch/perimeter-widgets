/// <reference types="vite/client" />

/**
 * Environment variable types for all packages.
 * Vite injects these at build time from .env files at the monorepo root.
 *
 * Naming convention: VITE_<DOMAIN>_<NAME>
 *   PW = Perimeter Widgets
 *   Categories: API, AUTH, FEATURE, DEBUG
 */
interface ImportMetaEnv {
    // --- API ---
    /** Override API base URL (default: localhost:5500 in dev, api.perimeter.org in prod) */
    readonly VITE_API_URL?: string;

    // --- Asset CDNs ---
    /**
     * Override the pdfjs worker URL template used by PdfViewer. Use `${version}`
     * as a placeholder for pdfjs.version. Default points at unpkg.
     */
    readonly VITE_PDFJS_WORKER_URL?: string;

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
