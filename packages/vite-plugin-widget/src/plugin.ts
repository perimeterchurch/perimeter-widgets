import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Plugin } from 'vite';
import { buildVirtualEntry, VIRTUAL_ENTRY_ID, CSS_PLACEHOLDER } from './virtual-entry.ts';

const RUNTIME_PACKAGE = '@perimeter/widget-runtime';

/**
 * Resolve the runtime package from this file's location so the virtual entry
 * can import it even when the consuming widget package lives outside the
 * workspace (e.g., during tests that build inside a temp dir).
 */
const runtimeRequire = createRequire(import.meta.url);
function resolveRuntimePackagePath(): string {
  return runtimeRequire.resolve(RUNTIME_PACKAGE);
}

export interface PerimeterWidgetPluginOptions {
  /** Widget name — MUST match the value in defineWidget({ name }). Required. */
  name: string;
  /** Path to the widget's source entry, relative to the package root. Defaults to 'src/index.ts'. */
  entry?: string | undefined;
  /** IIFE global name. Defaults to `PerimeterWidget_<name>`. */
  globalName?: string | undefined;
}

export function perimeterWidget(options: PerimeterWidgetPluginOptions): Plugin {
  let pkgVersion = '0.0.0';
  let entryAbsPath = '';
  const globalName = options.globalName ?? `PerimeterWidget_${options.name}`;
  const fileName = `${options.name}.iife.js`;

  return {
    name: '@perimeter/vite-plugin-widget',
    enforce: 'pre',

    config(userConfig, env) {
      // Vite hasn't fully resolved the root yet in the config hook; honor an
      // explicit `userConfig.root` if provided, otherwise fall back to cwd.
      const root = userConfig.root ? path.resolve(userConfig.root) : process.cwd();
      const pkgJsonPath = path.join(root, 'package.json');
      const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8')) as { version?: string };
      pkgVersion = pkg.version ?? '0.0.0';
      entryAbsPath = path.resolve(root, options.entry ?? 'src/index.ts');
      return {
        // Widgets ship as self-contained IIFEs straight to browsers — there is
        // no downstream bundler to substitute `process.env.NODE_ENV`. Vite's
        // library mode does not define it automatically, so the development
        // branches of React, ReactDOM, React Query, prop-types, etc. survive
        // minification as dead-but-unremovable code (and their dev builds ship
        // alongside the prod ones). Pinning it to "production" lets the minifier
        // tree-shake those branches out. Production-only by design; behavior is
        // unchanged because these widgets always run in production.
        define: {
          'process.env.NODE_ENV': '"production"',
        },
        build: {
          lib: {
            entry: VIRTUAL_ENTRY_ID,
            name: globalName,
            formats: ['iife'],
            fileName: () => fileName,
          },
          cssCodeSplit: false,
          sourcemap: true,
          // Avoid esbuild private-field transform helpers being hoisted above
          // the IIFE wrapper. Browsers we support (and jsDelivr consumers) all
          // grok native class private fields.
          target: 'es2022',
          emptyOutDir: env.command === 'build',
          rollupOptions: {
            // Override Vite's path.resolve(root, entry) for the lib entry — we
            // want the virtual \0-prefixed id passed verbatim to Rollup so that
            // our resolveId/load hooks below can serve the generated entry.
            input: VIRTUAL_ENTRY_ID,
          },
        },
      };
    },

    resolveId(id) {
      if (id === VIRTUAL_ENTRY_ID) return VIRTUAL_ENTRY_ID;
      if (id === RUNTIME_PACKAGE) return resolveRuntimePackagePath();
      return null;
    },

    load(id) {
      if (id === VIRTUAL_ENTRY_ID) {
        const entry = buildVirtualEntry({ entryId: entryAbsPath, version: pkgVersion });
        // Bake the configured global name into the bundle as a string literal
        // so it survives minification. The runtime publishes a unified
        // `window.PerimeterWidgets` namespace; the per-widget global name is
        // informational metadata (used by build tooling + the showcase site).
        return entry + `\ndef.__perimeterGlobal = ${JSON.stringify(globalName)};\n`;
      }
      return null;
    },

    /**
     * After Vite emits chunks + assets, find the single CSS asset (cssCodeSplit:false
     * guarantees there is at most one), substitute its contents into the JS chunk
     * at CSS_PLACEHOLDER, and drop the standalone CSS asset from the bundle.
     *
     * `order: 'post'` ensures this runs AFTER Vite's `vite:css-post` plugin
     * has emitted the combined CSS asset into the bundle.
     */
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        let cssText = '';
        let cssAssetName: string | null = null;
        for (const [fname, item] of Object.entries(bundle)) {
          if (item.type === 'asset' && fname.endsWith('.css')) {
            const source = item.source;
            cssText = typeof source === 'string' ? source : Buffer.from(source).toString('utf8');
            cssAssetName = fname;
            break;
          }
        }
        for (const item of Object.values(bundle)) {
          if (item.type === 'chunk') {
            item.code = item.code.replace(JSON.stringify(CSS_PLACEHOLDER), JSON.stringify(cssText));
          }
        }
        if (cssAssetName) delete bundle[cssAssetName];
      },
    },
  };
}
