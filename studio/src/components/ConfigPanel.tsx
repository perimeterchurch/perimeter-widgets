import { z } from 'zod';
import type { WidgetDefinition } from '@perimeter/widget-runtime';

interface Props {
  definition: WidgetDefinition;
  overrides: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

/**
 * Reach the underlying ZodObject through wrappers so refined schemas still get
 * per-field inputs. A `z.object({...}).refine(...)` (e.g. sermons) is a ZodEffects,
 * not a ZodObject — without unwrapping, the panel falls back to a useless JSON box.
 */
function unwrapObject(schema: z.ZodTypeAny): z.ZodObject<z.ZodRawShape> | null {
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

export function ConfigPanel({ definition, overrides, onChange }: Props) {
  const objectSchema = unwrapObject(definition.schema);
  if (!objectSchema) {
    return (
      <textarea
        className="h-32 w-full rounded border p-2 font-mono text-xs"
        defaultValue="{}"
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value) as Record<string, unknown>);
          } catch {
            /* ignore invalid json while typing */
          }
        }}
      />
    );
  }
  const keys = Object.keys(objectSchema.shape);
  const display = (value: unknown): string => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value);
  };
  return (
    <div className="flex flex-col gap-2 p-3">
      <h3 className="font-semibold">Config (data-*)</h3>
      {keys.map((key) => (
        <label key={key} className="grid grid-cols-2 items-center gap-2 text-sm">
          <span className="truncate">{key}</span>
          <input
            className="rounded border px-2 py-1"
            value={display(overrides[key])}
            onChange={(e) => onChange({ ...overrides, [key]: e.target.value })}
          />
        </label>
      ))}
    </div>
  );
}
