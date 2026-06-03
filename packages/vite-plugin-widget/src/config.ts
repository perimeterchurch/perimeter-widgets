import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { UserConfig } from 'vite';
import type { AcceptedPlugin } from 'postcss';

/**
 * Self-contained PostCSS plugin: rewrite `<n>rem` lengths to `<n*16>px` so
 * Tailwind's rem-based scale is immune to a host page's `html { font-size }`
 * once the widget renders inside a shadow root. No external dependency.
 */
const REM_RE = /(-?[\d.]+)rem\b/g;
export const remToPxPlugin = {
  postcssPlugin: 'perimeter-rem-to-px',
  Declaration(decl: { value: string }) {
    if (decl.value.includes('rem')) {
      decl.value = decl.value.replace(REM_RE, (_m, n: string) => `${parseFloat(n) * 16}px`);
    }
  },
};

export interface WidgetConfigOptions {
  /** Widget name — MUST match defineWidget({ name }). */
  name: string;
  /** Entry built into the IIFE. Defaults to 'src/entry.ts'. */
  entry?: string | undefined;
  /** IIFE global name. Defaults to `PerimeterWidget_<name>`. */
  globalName?: string | undefined;
  /** Override the version (tests). Defaults to the package.json version at cwd. */
  version?: string | undefined;
  /** Package root. Defaults to process.cwd(). */
  root?: string | undefined;
}

/**
 * Build the widget PostCSS chain explicitly.
 *
 * Vite 6 disables `postcss.config.js` auto-discovery the moment a config
 * supplies inline `css.postcss.plugins`. Because `widgetConfig()` injects
 * `remToPxPlugin` inline, the widget's `postcss.config.js` (tailwindcss +
 * autoprefixer) silently never ran — the shipped bundle carried raw, uncompiled
 * `@tailwind base/components/utilities` directives instead of compiled utility
 * CSS, so NO Tailwind reached production (parity finding H2's real root cause,
 * 2026-06-02). Declaring the full chain inline here (tailwindcss + autoprefixer
 * + remToPxPlugin) is the single source of truth that actually ships.
 *
 * tailwindcss and autoprefixer are resolved from the widget `root` (each widget
 * declares them), and tailwind is pointed at the widget's `tailwind.config.ts`.
 */
function widgetPostcssPlugins(root: string): AcceptedPlugin[] {
  const require = createRequire(path.join(root, 'package.json'));
  const tailwindcss = require('tailwindcss') as (opts?: unknown) => AcceptedPlugin;
  const autoprefixer = require('autoprefixer') as (opts?: unknown) => AcceptedPlugin;

  const tailwindConfig = ['tailwind.config.ts', 'tailwind.config.js']
    .map((f) => path.join(root, f))
    .find((p) => existsSync(p));

  return [
    tailwindcss(tailwindConfig ? { config: tailwindConfig } : undefined),
    autoprefixer(),
    remToPxPlugin,
  ];
}

function readVersion(root: string): string {
  try {
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      version?: string;
    };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Returns a Vite config for building a widget into a single self-contained IIFE.
 * No virtual entry, no CSS placeholder substitution: the widget's `src/entry.ts`
 * imports its compiled CSS via `?inline` and calls `autoMount(widget, css)`.
 */
export function widgetConfig(options: WidgetConfigOptions): UserConfig {
  const root = options.root ?? process.cwd();
  const version = options.version ?? readVersion(root);
  const entry = path.resolve(root, options.entry ?? 'src/entry.ts');
  // Widget names are kebab-case; an IIFE global must be a legal JS identifier,
  // so map any non-identifier char (e.g. the hyphen in `event-list`) to `_`.
  const safeName = options.name.replace(/[^A-Za-z0-9_$]/g, '_');
  const globalName = options.globalName ?? `PerimeterWidget_${safeName}`;

  return {
    define: {
      // Tree-shake React/ReactDOM/RQ dev branches out of the browser-shipped IIFE.
      'process.env.NODE_ENV': '"production"',
      __PERIMETER_WIDGET_VERSION__: JSON.stringify(version),
    },
    css: { postcss: { plugins: widgetPostcssPlugins(root) } },
    build: {
      lib: { entry, name: globalName, formats: ['iife'], fileName: () => 'index.js' },
      outDir: 'dist',
      sourcemap: true,
      target: 'es2022',
      emptyOutDir: true,
      rollupOptions: {
        // Silence noise that's irrelevant to a self-contained IIFE build:
        // - MODULE_LEVEL_DIRECTIVE: third-party React libs (framer-motion, react-query,
        //   nuqs, react-pdf, @base-ui) ship "use client"/"use server" RSC directives that
        //   Rollup strips when bundling — one warning per file, harmless here.
        // - SOURCEMAP_ERROR / "Can't resolve original location": Rollup failing to map the
        //   above warnings back to a sourcemap line. Real build errors are unaffected.
        onwarn(warning, defaultHandler) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
          if (warning.code === 'SOURCEMAP_ERROR') return;
          if (
            typeof warning.message === 'string' &&
            warning.message.includes("Can't resolve original location")
          ) {
            return;
          }
          defaultHandler(warning);
        },
      },
    },
  };
}
