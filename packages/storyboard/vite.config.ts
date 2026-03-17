import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    // Load .env files from monorepo root (not just packages/storyboard/)
    envDir: resolve(import.meta.dirname, '../..'),
    server: {
        port: 5180,
    },
});
