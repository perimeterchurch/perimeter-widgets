import { z } from 'zod';

/**
 * Reach the underlying ZodObject through wrappers so refined schemas still get
 * per-field inputs. A `z.object({...}).refine(...)` (e.g. sermons) is a ZodEffects,
 * not a ZodObject — without unwrapping, callers fall back to a useless JSON box.
 *
 * Shared by ConfigPanel (per-field inputs) and InfoPanel (schema reference table)
 * so the wrapper-walk lives in one place.
 */
export function unwrapObject(schema: z.ZodTypeAny): z.ZodObject<z.ZodRawShape> | null {
  let current: z.ZodTypeAny = schema;
  for (let i = 0; i < 10; i++) {
    if (current instanceof z.ZodObject) return current as z.ZodObject<z.ZodRawShape>;
    // zod's wrapper unwrap methods are typed loosely (effectively `any`); the runtime
    // values are ZodTypeAny, so this walk is safe.
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    if (current instanceof z.ZodEffects) {
      current = current.innerType();
    } else if (current instanceof z.ZodDefault) {
      current = current.removeDefault();
    } else if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
      current = current.unwrap();
    } else {
      return null;
    }
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  }
  return null;
}

export interface SchemaField {
  key: string;
  /** Human-readable zod type, e.g. `string`, `number`, `enum(grid | list)`. */
  type: string;
  /** The schema default formatted for display, or null when the field has none. */
  default: string | null;
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
function describeField(field: z.ZodTypeAny): Omit<SchemaField, 'key'> {
  let current: z.ZodTypeAny = field;
  let defaultValue: string | null = null;
  let optional = false;

  // Capture the description from the OUTERMOST wrapper before peeling —
  // ZodDefault/ZodOptional do not reliably copy `.describe()` to the inner
  // type. Fall back to the inner type's description (set below) if absent.
  let description: string | null = field.description ?? null;

  for (let i = 0; i < 10; i++) {
    if (current instanceof z.ZodDefault) {
      // defaultValue() is loosely typed (`any`); format defensively.
      defaultValue = formatDefault(current._def.defaultValue());
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
      current = current.removeDefault();
    } else if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
      optional = true;
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
      current = current.unwrap();
    } else if (current instanceof z.ZodEffects) {
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
      current = current.innerType();
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
      // z.coerce.number().min(0).max(20) stores constraints as checks.
      for (const check of current._def.checks) {
        if (check.kind === 'min') min = check.value;
        else if (check.kind === 'max') max = check.value;
      }
    }
    // ZodString → "string", ZodNumber → "number", ZodBoolean → "boolean", etc.
    const ctor = current.constructor.name; // e.g. "ZodString"
    type = ctor.replace(/^Zod/, '').toLowerCase();
  }

  return { type, default: defaultValue, optional, enumOptions, min, max, description };
}

/**
 * Derive a flat field reference (key, type, default, optionality) for every key
 * of a widget's schema. Returns `[]` when the schema isn't an object-shaped one.
 */
export function describeSchemaFields(schema: z.ZodTypeAny): SchemaField[] {
  const object = unwrapObject(schema);
  if (!object) return [];
  return Object.entries(object.shape).map(([key, field]) => ({
    key,
    ...describeField(field),
  }));
}
