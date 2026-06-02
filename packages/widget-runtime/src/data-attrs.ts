import type { z } from 'zod';

const THEME_PREFIX = 'data-theme-';
const MARKER = 'data-perimeter-widget';

function kebabToCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * The `"true"/"false"`→bool shorthand prod applies to string `data-*` values.
 * zod's `z.coerce.boolean()` CANNOT replace this (`Boolean('false') === true`),
 * so studio `configOverrides` must run it before re-validation to match prod.
 * Returns the boolean for the exact strings `'true'`/`'false'`, the value untouched otherwise.
 */
export function applyBoolShorthand(value: unknown): unknown {
  return value === 'true' ? true : value === 'false' ? false : value;
}

export interface ParsedAttrs<T> {
  config: T;
  themeOverrides: Record<string, string>;
}

export function parseDataAttrs<S extends z.ZodTypeAny>(
  el: HTMLElement,
  schema: S,
): ParsedAttrs<z.infer<S>> {
  const rawConfig: Record<string, unknown> = {};
  const themeOverrides: Record<string, string> = {};

  for (const attr of Array.from(el.attributes)) {
    const name = attr.name;
    if (!name.startsWith('data-')) continue;
    if (name === MARKER) continue;
    if (name.startsWith(THEME_PREFIX)) {
      themeOverrides[name] = attr.value;
      continue;
    }
    const key = kebabToCamel(name.slice('data-'.length));
    rawConfig[key] = applyBoolShorthand(attr.value);
  }

  const config = schema.parse(rawConfig) as z.infer<S>;
  return { config, themeOverrides };
}
