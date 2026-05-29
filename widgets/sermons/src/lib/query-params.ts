/** Serialize a number[] of selected IDs into the comma-joined query string the
 * API expects, or `undefined` when nothing is selected. */
export function idsParam(ids: number[]): string | undefined {
  return ids.length > 0 ? ids.join(',') : undefined;
}

/**
 * Drops keys whose value is `undefined`. The new `@perimeter/api-hooks` param
 * types are exact-optional (`key?: string`, not `key?: string | undefined`),
 * so we cannot pass `undefined` values explicitly under
 * `exactOptionalPropertyTypes`. Pruning here lets the composite assemble
 * params from optional filter state and hand a clean object to each hook.
 */
export function defined<T extends Record<string, unknown>>(
  obj: T,
): { [K in keyof T]: Exclude<T[K], undefined> } {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out as { [K in keyof T]: Exclude<T[K], undefined> };
}
