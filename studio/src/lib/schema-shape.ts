import { z } from 'zod';

/**
 * Step through a `z.pipe` (what zod 4 builds for `.transform()` and
 * `z.preprocess()`) to the side that carries the schema's shape: the input,
 * unless the input is the bare transform function of a preprocess.
 */
function unwrapPipe(pipe: z.ZodPipe): z.ZodType {
  return (pipe.in instanceof z.ZodTransform ? pipe.out : pipe.in) as z.ZodType;
}

/**
 * Reach the underlying ZodObject through wrappers so transformed schemas still get
 * per-field inputs. (In zod 4 a `.refine()` stays a ZodObject; a `.transform()` is
 * a ZodPipe.) Without unwrapping, callers fall back to a useless JSON box.
 *
 * Shared by ConfigPanel (per-field inputs) and InfoPanel (schema reference table)
 * so the wrapper-walk lives in one place.
 */
export function unwrapObject(schema: z.ZodType): z.ZodObject<z.ZodRawShape> | null {
  let current: z.ZodType = schema;
  for (let i = 0; i < 10; i++) {
    if (current instanceof z.ZodObject) return current;
    if (current instanceof z.ZodPipe) {
      current = unwrapPipe(current);
    } else if (
      current instanceof z.ZodDefault ||
      current instanceof z.ZodOptional ||
      current instanceof z.ZodNullable
    ) {
      current = current.unwrap() as z.ZodType;
    } else {
      return null;
    }
  }
  return null;
}

export interface SchemaField {
  key: string;
  /** Human-readable zod type, e.g. `string`, `number`, `enum(grid | list)`. */
  type: string;
  /** The schema default formatted for display, or null when the field has none. */
  default: string | null;
  /**
   * The same default as its REAL value rather than display text, or undefined when
   * the field has none. Controls that need to render the default as state (the
   * boolean switch showing a `default(true)` field as on) must not have to parse
   * `default`'s formatting back into a value.
   */
  rawDefault: unknown;
  /** Whether the field is optional (no value required). */
  optional: boolean;
  /** Allowed values for a ZodEnum field, or null for non-enum fields. */
  enumOptions: string[] | null;
  /** Minimum from a ZodNumber `min` check, or null when unconstrained. */
  min: number | null;
  /** Maximum from a ZodNumber `max` check, or null when unconstrained. */
  max: number | null;
  /**
   * The field's `.describe(...)` text (what the field affects), or null.
   * Read from the OUTERMOST wrapper first — `ZodDefault`/`ZodOptional` don't
   * reliably copy a description inward.
   */
  description: string | null;
}

function formatDefault(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

/**
 * Describe a single field's inner type + default by peeling the same wrappers
 * `unwrapObject` understands. The default lives on the OUTER `ZodDefault`, so it
 * is captured before unwrapping; optionality is recorded as we pass an Optional
 * /Nullable wrapper. The innermost type's class name becomes the label.
 */
function describeField(field: z.ZodType): Omit<SchemaField, 'key'> {
  let current: z.ZodType = field;
  let defaultValue: string | null = null;
  let rawDefault: unknown;
  let optional = false;

  // Capture the description from the OUTERMOST wrapper before peeling —
  // ZodDefault/ZodOptional do not reliably copy `.describe()` to the inner
  // type. Fall back to the inner type's description (set below) if absent.
  let description: string | null = field.description ?? null;

  for (let i = 0; i < 10; i++) {
    if (current instanceof z.ZodDefault) {
      // zod 4 stores the default as a value (a getter), not a factory. Keep the
      // real value for controls (as `unknown`, so callers must narrow) and format
      // defensively for display.
      rawDefault = current.def.defaultValue;
      defaultValue = formatDefault(rawDefault);
      current = current.unwrap() as z.ZodType;
    } else if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
      optional = true;
      current = current.unwrap() as z.ZodType;
    } else if (current instanceof z.ZodPipe) {
      current = unwrapPipe(current);
    } else {
      break;
    }
  }

  // Fall back to the inner type's description if no outer wrapper carried one.
  if (description === null && current.description) {
    description = current.description;
  }

  let type: string;
  let enumOptions: string[] | null = null;
  let min: number | null = null;
  let max: number | null = null;

  if (current instanceof z.ZodEnum) {
    enumOptions = current.options as string[];
    type = `enum(${enumOptions.join(' | ')})`;
  } else {
    if (current instanceof z.ZodNumber) {
      // z.coerce.number().min(0).max(20) stores constraints as checks. Read the
      // explicit bounds only — NOT `minValue`/`maxValue`, which also fold in
      // `.int()`'s ±MAX_SAFE_INTEGER range and would show it as a real limit.
      for (const check of current.def.checks ?? []) {
        const def = check._zod.def as { check: string; value?: unknown };
        if (typeof def.value !== 'number') continue;
        if (def.check === 'greater_than') min = def.value;
        else if (def.check === 'less_than') max = def.value;
      }
    }
    // "string", "number", "boolean", etc.
    //
    // Read the name from zod's `def.type` — a STRING zod stores on every schema —
    // NOT from `constructor.name`. A production build minifies zod's class names,
    // so `constructor.name` becomes a mangled letter and `type` never equals
    // "boolean"/"number"; every field then falls through to a text input. This
    // only reproduces in the minified bundle — the dev server and the Playwright
    // harness both run unminified source. `def.type` is a string literal, so it
    // survives. Guarded by schema-shape.test.ts's minification-safety test.
    type = current.def.type;
  }

  return { type, default: defaultValue, rawDefault, optional, enumOptions, min, max, description };
}

/**
 * Derive a flat field reference (key, type, default, optionality) for every key
 * of a widget's schema. Returns `[]` when the schema isn't an object-shaped one.
 */
export function describeSchemaFields(schema: z.ZodType): SchemaField[] {
  const object = unwrapObject(schema);
  if (!object) return [];
  return Object.entries(object.shape).map(([key, field]) => ({
    key,
    ...describeField(field as z.ZodType),
  }));
}
