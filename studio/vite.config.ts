import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { remToPxPlugin } from '@perimeter/vite-plugin-widget';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The MDX plugin injects `import { useMDXComponents } from '@mdx-js/react'` into
// every compiled .mdx. Our docs live at repo root (docs/*.mdx), outside the studio
// package dir, and pnpm's strict node_modules layout means a bare specifier can't
// be resolved from there — dev, test, and build all fail to find @mdx-js/react.
// Pin it to the copy hoisted under studio/node_modules so repo-root MDX resolves.
const require = createRequire(import.meta.url);
const mdxReact = require.resolve('@mdx-js/react');

export default defineConfig({
  plugins: [
    // MDX must run BEFORE @vitejs/plugin-react so JSX in `.mdx` is emitted as JS
    // that the React transform can then pick up (enforce: 'pre').
    { enforce: 'pre', ...mdx({ providerImportSource: '@mdx-js/react' }) },
    // include MDX/MD so the React transform + Fast Refresh apply to MDX-emitted JS;
    // the bare react() will not handle MDX-emitted JS.
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
  ],
  // Same PostCSS chain a shipped widget gets (rem→px is the prod transform —
  // parity finding H1): with css.postcss inline, postcss.config.js is ignored,
  // so it is deleted to leave exactly one source of truth.
  css: { postcss: { plugins: [tailwindcss(), autoprefixer(), remToPxPlugin] } },
  resolve: { alias: { '@mdx-js/react': mdxReact } },
  server: { fs: { allow: [workspaceRoot] } },
});
