import type { UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';
import type { UserConfig as VitestUserConfig } from 'vitest/config';

interface WidgetConfigOptions {
    name: string;
    entry: string;
}

export function createWidgetConfig(options: WidgetConfigOptions): UserConfig {
    const { name, entry } = options;
    const globalName = `PerimeterWidget_${name.charAt(0).toUpperCase() + name.slice(1)}`;

    return {
        plugins: [react(), tailwindcss(), tsconfigPaths()],
        // Load .env files from monorepo root
        envDir: resolve(process.cwd(), '../..'),
        build: {
            lib: {
                entry: resolve(process.cwd(), entry),
                name: globalName,
                formats: ['iife'],
                fileName: () => `${name}.js`,
            },
            outDir: resolve(process.cwd(), `../../dist/${name}`),
            emptyOutDir: true,
            minify: 'esbuild',
            rollupOptions: {
                output: {
                    inlineDynamicImports: true,
                },
            },
        },
        define: {
            'process.env.NODE_ENV': JSON.stringify(
                process.env.NODE_ENV || 'production',
            ),
        },
    };
}

export function createWidgetTestConfig(): VitestUserConfig {
    return {
        plugins: [react(), tsconfigPaths()],
        test: {
            environment: 'jsdom',
            globals: true,
            setupFiles: [resolve(import.meta.dirname, 'test-setup.js')],
            css: false,
        },
    };
}
