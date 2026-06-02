import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { remToPxPlugin } from '@perimeter/vite-plugin-widget';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  plugins: [react()],
  // Same PostCSS chain a shipped widget gets (rem→px is the prod transform —
  // parity finding H1): with css.postcss inline, postcss.config.js is ignored,
  // so it is deleted to leave exactly one source of truth.
  css: { postcss: { plugins: [tailwindcss(), autoprefixer(), remToPxPlugin] } },
  server: { fs: { allow: [workspaceRoot] } },
});
