import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { unwrapObject } from '../lib/schema-shape';

interface Props {
  definition: WidgetDefinition;
  overrides: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
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
        <label
          key={key}
          className="grid grid-cols-[minmax(6rem,auto)_1fr] items-center gap-2 text-sm"
        >
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
