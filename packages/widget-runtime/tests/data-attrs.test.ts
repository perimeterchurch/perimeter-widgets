import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { parseDataAttrs } from '../src/data-attrs';

function divWith(attrs: Record<string, string>): HTMLElement {
  const el = document.createElement('div');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

const schema = z.object({
  seriesId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  initialView: z.enum(['grid', 'list']).default('grid'),
});

describe('parseDataAttrs', () => {
  it('parses non-theme data-* attributes into config using the schema', () => {
    const el = divWith({ 'data-series-id': 'abc', 'data-limit': '6' });
    const { config } = parseDataAttrs(el, schema);
    expect(config).toEqual({ seriesId: 'abc', limit: 6, initialView: 'grid' });
  });

  it('returns data-theme-* attributes separately', () => {
    const el = divWith({
      'data-limit': '3',
      'data-theme-color-primary': 'hsl(15 80% 50%)',
      'data-theme-radius-md': '4px',
    });
    const { themeOverrides } = parseDataAttrs(el, schema);
    expect(themeOverrides).toEqual({
      'data-theme-color-primary': 'hsl(15 80% 50%)',
      'data-theme-radius-md': '4px',
    });
  });

  it('converts kebab-case attribute names to camelCase for config keys', () => {
    const el = divWith({ 'data-initial-view': 'list' });
    const { config } = parseDataAttrs(el, schema);
    expect(config.initialView).toBe('list');
  });

  it('throws a descriptive error when validation fails', () => {
    const el = divWith({ 'data-limit': '999' });
    expect(() => parseDataAttrs(el, schema)).toThrow(/limit/);
  });

  it('ignores the data-perimeter-widget marker attribute', () => {
    const el = divWith({ 'data-perimeter-widget': 'sermons', 'data-limit': '3' });
    const { config } = parseDataAttrs(el, schema);
    expect(config.limit).toBe(3);
    expect(Object.keys(config)).not.toContain('perimeterWidget');
  });
});

describe('parseDataAttrs booleans', () => {
  const boolSchema = z.object({ open: z.boolean().default(false), limit: z.coerce.number().default(1) });

  it('parses data-open="false" as boolean false (not truthy string)', () => {
    const { config } = parseDataAttrs(divWith({ 'data-open': 'false', 'data-limit': '5' }), boolSchema);
    expect(config.open).toBe(false);
    expect(config.limit).toBe(5);
  });
  it('parses data-open="true" as boolean true', () => {
    const { config } = parseDataAttrs(divWith({ 'data-open': 'true' }), boolSchema);
    expect(config.open).toBe(true);
  });
});
