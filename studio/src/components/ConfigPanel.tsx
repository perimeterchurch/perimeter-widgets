import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { describeSchemaFields, unwrapObject, type SchemaField } from '../lib/schema-shape';
import { fieldLabel } from '../lib/field-label';
import { camelToKebab } from '../lib/data-attr';

interface Props {
  definition: WidgetDefinition;
  overrides: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

// Every text/number/select control shares one height (`h-9`) and fills the
// control column (`w-full`) so their left AND right edges line up down the panel,
// regardless of field type. `py-1` is dropped — `h-9` owns the vertical size.
const INPUT_CLASS =
  'h-9 w-full rounded-md border border-border bg-bg px-2 text-sm text-fg transition-colors focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring/40';

/**
 * The small `text-muted-fg` line under each control: the field's description (what
 * it affects), then the constraint that matters for that control — the enum's
 * allowed values, a number's range — followed by the default and an optional flag.
 * Built as discrete parts so we only show what applies to the field.
 *
 * The `data-*` attribute is NOT in here — it is rendered separately, in mono, so
 * it stays findable now that the row is headed by a prose label rather than by
 * the schema key.
 */
function fieldHint(field: SchemaField): string {
  const parts: string[] = [];
  if (field.description) parts.push(field.description);
  if (field.enumOptions) parts.push(`Options: ${field.enumOptions.join(' | ')}`);
  if (field.min !== null || field.max !== null) {
    const lo = field.min ?? '−∞';
    const hi = field.max ?? '∞';
    parts.push(`Range: ${lo}–${hi}`);
  }
  if (field.default !== null) parts.push(`Default: ${field.default}`);
  if (field.optional) parts.push('Optional');
  return parts.join(' · ');
}

export function ConfigPanel({ definition, overrides, onChange }: Props) {
  const objectSchema = unwrapObject(definition.schema);

  // Non-object schemas (rare) have no per-field shape — keep the raw-JSON escape
  // hatch, but tokenize it so it stays legible in dark mode like everything else.
  if (!objectSchema) {
    return (
      <div className="p-3">
        <textarea
          className="h-32 w-full rounded-md border border-border bg-bg p-2 font-mono text-xs text-fg"
          defaultValue="{}"
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value) as Record<string, unknown>);
            } catch {
              /* ignore invalid json while typing */
            }
          }}
        />
      </div>
    );
  }

  const fields = describeSchemaFields(definition.schema);
  const set = (key: string, value: unknown) => onChange({ ...overrides, [key]: value });

  return (
    // `gap-5` between rows against the rows' own `gap-y-1`: each field's control and
    // its hint line have to read as one group, and at the old `gap-3` the 12px
    // between fields was close enough to the 4px inside them that the list looked
    // like one undifferentiated block.
    <div className="flex flex-col gap-5 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
        Config (data-*)
      </h3>
      {fields.map((field) => (
        <label
          key={field.key}
          // The label column is wider than it was, and wraps rather than
          // truncating: these are sentences now, and "Show remaining spots on a
          // trip" truncated to "Show remaini…" would be worse than the key it
          // replaced.
          className="grid grid-cols-[minmax(9rem,11rem)_1fr] items-center gap-x-3 gap-y-1 text-sm"
        >
          <span className="font-medium text-balance text-fg">
            {fieldLabel(field.key, definition.configLabels)}
          </span>
          <FieldControl field={field} value={overrides[field.key]} onChange={set} />
          {/* Hint spans the input column so it lines up under the control. */}
          <span className="col-start-2 text-xs leading-snug text-muted-fg">
            <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.7rem] text-fg">
              data-{camelToKebab(field.key)}
            </code>{' '}
            {fieldHint(field)}
          </span>
        </label>
      ))}
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: SchemaField;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}) {
  // Boolean → on/off switch, emitting a real boolean.
  //
  // `overrides` is sparse: an untouched field has no entry at all, and the widget
  // gets the schema's own default. So the switch must show that DEFAULT rather than
  // off — a `default(true)` field rendering as off while its hint read
  // "Default: true" implied the option was disabled when the widget had it on.
  if (field.type === 'boolean') {
    const on = typeof value === 'boolean' ? value : field.rawDefault === true;
    return <BooleanSwitch checked={on} onChange={(next) => onChange(field.key, next)} />;
  }

  // Enum → native select with exactly the allowed options.
  if (field.enumOptions) {
    return (
      <select
        className={INPUT_CLASS}
        value={typeof value === 'string' ? value : (field.enumOptions[0] ?? '')}
        onChange={(e) => onChange(field.key, e.target.value)}
      >
        {field.enumOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  // Number → number input with the schema's min/max, emitting a real number
  // (empty input clears the override rather than emitting NaN).
  if (field.type === 'number') {
    return (
      <input
        type="number"
        className={INPUT_CLASS}
        min={field.min ?? undefined}
        max={field.max ?? undefined}
        value={typeof value === 'number' ? value : ''}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(field.key, raw === '' ? undefined : Number(raw));
        }}
      />
    );
  }

  // Everything else → text input emitting a string. Only reflect a primitive
  // back into the field; an unexpected object override stays invisible rather
  // than rendering "[object Object]".
  const text =
    typeof value === 'string'
      ? value
      : typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : '';
  return (
    <input
      type="text"
      className={INPUT_CLASS}
      value={text}
      onChange={(e) => onChange(field.key, e.target.value)}
    />
  );
}

/**
 * On/off switch for a boolean field — a track that fills with `primary` and a thumb
 * that slides, so the control's own shape says "on" or "off" without reading a hint.
 *
 * A real `<input type="checkbox">` remains the control: it keeps native keyboard
 * toggling and stays labelable, so the field row's `<label>` wrapper still targets
 * it. `role="switch"` is what makes assistive tech announce it as on/off rather
 * than checked/unchecked. The track and thumb are SIBLING spans rather than
 * `::before`/`::after` on the input, because pseudo-elements don't render on
 * replaced elements like `<input>`; `peer-checked:` styles them off the input's
 * state, which is why the input must come first in the DOM.
 *
 * The thumb uses `muted-fg` off / `primary-fg` on so it stays legible against both
 * track colors in light AND dark themes.
 *
 * No explicit `aria-checked`: HTML-AAM already maps a native checkbox's checkedness
 * onto the switch role's on/off state, so hand-setting it would only add a second
 * source of truth to keep in sync.
 *
 * The readout beside the track says `true`/`false` rather than On/Off deliberately:
 * this panel edits `data-*` attributes, so the value the switch is reporting is the
 * one that gets copied out as `data-show-image="false"`, and it's the same word the
 * hint's "Default: true" and the Info tab's schema table use. On/Off would be a
 * second vocabulary for one value. It's `aria-hidden` because the switch role
 * already announces its own state — otherwise AT would read the value twice.
 */
function BooleanSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <span className="inline-flex items-center gap-2 justify-self-start">
      <span className="relative inline-flex h-5 w-9 shrink-0">
        <input
          type="checkbox"
          role="switch"
          className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none rounded-full focus:outline-hidden"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="pointer-events-none absolute inset-0 rounded-full border border-border bg-muted transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring/40" />
        <span className="pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-muted-fg transition peer-checked:translate-x-4 peer-checked:bg-primary-fg" />
      </span>
      <span aria-hidden="true" className="text-xs font-medium text-fg">
        {checked ? 'true' : 'false'}
      </span>
    </span>
  );
}
