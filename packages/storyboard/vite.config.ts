import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react(), tailwindcss(), tsconfigPaths()],
    // Load .env files from monorepo root (not just packages/storyboard/)
    envDir: resolve(import.meta.dirname, '../..'),
    server: {
        port: 5180,
        proxy: {
            // Proxy /api requests to perimeter-api when using live data
            '/api': {
                target: 'http://localhost:5500',
                changeOrigin: true,
            },
            // Proxy S3 file requests to avoid CORS issues in dev
            '/s3-proxy': {
                target: 'https://perimeter-files.s3.amazonaws.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/s3-proxy/, ''),
            },
        },
    },
});
