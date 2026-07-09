/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import tailwindcss from '@tailwindcss/postcss';
import { remToPxPlugin } from '@perimeter/vite-plugin-widget';
import { devServerProxy } from './src/dev-proxy';
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
    // Frontmatter: strip `---` blocks from rendered output and expose them as a
    // `frontmatter` named export (catalog card descriptions read it).
    {
      enforce: 'pre',
      ...mdx({
        providerImportSource: '@mdx-js/react',
        remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
      }),
    },
    // include MDX/MD so the React transform + Fast Refresh apply to MDX-emitted JS;
    // the bare react() will not handle MDX-emitted JS.
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
  ],
  // Same PostCSS chain a shipped widget gets (rem→px is the prod transform —
  // parity finding H1): with css.postcss inline, postcss.config.js is ignored,
  // so it is deleted to leave exactly one source of truth. Tailwind v4's
  // postcss plugin handles imports + vendor prefixing itself (no autoprefixer).
  css: { postcss: { plugins: [tailwindcss(), remToPxPlugin] } },
  resolve: { alias: { '@mdx-js/react': mdxReact } },
  // esbuild (pinned to 0.28 by the repo-root pnpm override) hard-errors trying to
  // downlevel destructuring for Vite's default target (es2020) — a known
  // incompatibility with the esbuild ^0.25 Vite 6 was built against. Pin es2022
  // (what every widget IIFE already ships) at BOTH Vite esbuild entry points:
  // `build.target` for the production build, and `optimizeDeps.esbuildOptions.target`
  // for the dev server's dependency pre-bundling — miss either and that path floods
  // with the destructuring error (build was fixed first; dev pre-bundling is this).
  build: { target: 'es2022' },
  optimizeDeps: { esbuildOptions: { target: 'es2022' } },
  // `proxy` forwards the sermons widget's `/s3-proxy/…` dev requests to S3 — see
  // src/dev-proxy.ts (extracted so it can be unit-tested without this config).
  server: { fs: { allow: [workspaceRoot] }, proxy: devServerProxy },
  // The Playwright visual harness lives in `visual/*.spec.ts`. Vitest has no
  // `test` block here, so its default include (`**/*.{test,spec}.tsx?`) WOULD
  // collect those Playwright specs and fail (no browser, wrong runner). Exclude
  // the whole `visual/` tree from the vitest run; it is driven by `pnpm visual`.
  test: {
    exclude: [...configDefaults.exclude, 'visual/**'],
    // Node's experimental webstorage global would otherwise shadow happy-dom's
    // localStorage with undefined (same fix as packages/auth/vitest.config.ts) —
    // MpLoginPanel's MPLocalStorageAuth reads localStorage in tests.
    execArgv: ['--no-experimental-webstorage'],
    // Catalog page tests import REAL widget modules through the vite transform;
    // under CI's parallel `turbo … test` load that alone can exceed vitest's 5s
    // default, and several assertions already wait up to 10s (findBy timeouts) —
    // a 10s wait inside a 5s test budget trips the test timeout first. 20s keeps
    // the budget above the longest individual wait.
    testTimeout: 20_000,
  },
});
