// packages/vite-plugin-widget/tests/config.test.ts
import { describe, it, expect } from 'vitest';
import { widgetConfig } from '../src/config';

describe('widgetConfig', () => {
  const cfg = widgetConfig({ name: 'demo', version: '1.2.3' });

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
});
