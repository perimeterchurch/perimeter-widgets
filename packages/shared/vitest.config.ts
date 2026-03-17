import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: [
            new URL(
                './node_modules/@perimeter-widgets/vite-preset/src/test-setup.ts',
                import.meta.url,
            ).pathname,
        ],
        css: false,
    },
});
