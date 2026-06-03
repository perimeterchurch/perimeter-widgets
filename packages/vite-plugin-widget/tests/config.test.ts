// packages/vite-plugin-widget/tests/config.test.ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { widgetConfig, remToPxPlugin } from '../src/config';

// widgetConfig resolves tailwindcss + autoprefixer from the widget `root`, so
// point it at a real widget dir (the reference `example` widget) where those
// deps resolve — the plugin package itself does not declare them.
const widgetRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../widgets/example',
);

describe('widgetConfig', () => {
  const cfg = widgetConfig({ name: 'demo', version: '1.2.3', root: widgetRoot });

  it('builds src/entry.ts as a single IIFE named after the widget', () => {
    expect(cfg.build?.lib).toMatchObject({ formats: ['iife'] });
    // entry resolves to the widget's src/entry.ts
    expect(String((cfg.build!.lib as unknown as { entry: string }).entry)).toMatch(/entry\.ts$/);
  });
  it('emits one file named index.js', () => {
    const fileName = (cfg.build!.lib as unknown as { fileName: (f: string) => string }).fileName(
      'iife',
    );
    expect(fileName).toBe('index.js');
  });
  it('sanitizes the IIFE global name so a kebab-case widget name stays a legal identifier', () => {
    const kebab = widgetConfig({ name: 'event-list', version: '1.0.0', root: widgetRoot });
    expect((kebab.build!.lib as unknown as { name: string }).name).toBe(
      'PerimeterWidget_event_list',
    );
  });
  it('pins NODE_ENV=production and injects the widget version', () => {
    expect(cfg.define).toMatchObject({
      'process.env.NODE_ENV': '"production"',
      __PERIMETER_WIDGET_VERSION__: '"1.2.3"',
    });
  });
  it('outputs to dist with sourcemaps', () => {
    expect(cfg.build?.outDir).toBe('dist');
    expect(cfg.build?.sourcemap).toBe(true);
  });

  // Regression guard for parity finding H2's root cause: inline `css.postcss.plugins`
  // disables Vite's postcss.config.js auto-discovery, so tailwindcss + autoprefixer
  // MUST be declared inline here or NO Tailwind compiles into the shipped bundle.
  it('runs the full PostCSS chain inline: tailwindcss + autoprefixer + remToPxPlugin', () => {
    const postcss = cfg.css?.postcss;
    const plugins =
      postcss && typeof postcss !== 'string' && 'plugins' in postcss ? postcss.plugins : undefined;
    expect(plugins).toBeDefined();
    expect(plugins!.length).toBe(3);
    const names = plugins!.map((p) =>
      typeof p === 'function' ? p.name : (p as { postcssPlugin?: string }).postcssPlugin,
    );
    expect(names).toContain('tailwindcss');
    expect(names).toContain('autoprefixer');
    // remToPxPlugin must run LAST so it rewrites rem in the compiled utility CSS.
    expect(plugins![plugins!.length - 1]).toBe(remToPxPlugin);
  });
});
