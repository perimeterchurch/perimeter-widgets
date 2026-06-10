import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { Badge } from '@perimeter/ui/badge';
import { Button } from '@perimeter/ui/button';
import { useCopiedFlash } from '@perimeter/ui/hooks/use-copied-flash';
import { describeSchemaFields, type SchemaField } from '../lib/schema-shape';
import { camelToKebab } from '../lib/data-attr';

interface Props {
  definition: WidgetDefinition;
}

/**
 * The exact `data-*` attribute (name + default value) a developer would paste
 * into the embed div for a field, e.g. `data-per-page="12"`. A field with no
 * schema default still yields the bare attr so the snippet is editable.
 */
function dataAttrSnippet(field: SchemaField): string {
  const name = `data-${camelToKebab(field.key)}`;
  return field.default === null ? `${name}=""` : `${name}="${field.default}"`;
}

/** Badge tone per auth mode — none is neutral, optional notable, required strict. */
const AUTH_TONE: Record<string, 'default' | 'secondary' | 'destructive'> = {
  none: 'secondary',
  optional: 'default',
  required: 'destructive',
};

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-fg">{label}</span>
      <span className="min-w-0 text-right text-sm text-fg">{children}</span>
    </div>
  );
}

/**
 * Read-only reference for a widget: its identity (name / auth / version) and a
 * table of config fields derived from the zod schema. Schema-field introspection
 * is shared with ConfigPanel via `describeSchemaFields`. Live bundle size is
 * intentionally omitted — it isn't available in the dev studio (it belongs to a
 * generated CDN manifest, out of scope here).
 */
export function InfoPanel({ definition }: Props) {
  const fields = describeSchemaFields(definition.schema);

  return (
    <div className="flex flex-col gap-5 p-3">
      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Widget</h3>
        <div className="rounded-md border border-border bg-bg px-3 py-1.5">
          <MetaRow label="Name">
            <span className="font-mono">{definition.name}</span>
          </MetaRow>
          <MetaRow label="Auth">
            <Badge variant={AUTH_TONE[definition.auth] ?? 'secondary'}>{definition.auth}</Badge>
          </MetaRow>
          {definition.version && (
            <MetaRow label="Version">
              <span className="font-mono">{definition.version}</span>
            </MetaRow>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
          Config schema
        </h3>
        {fields.length === 0 ? (
          <p className="text-sm text-muted-fg">This widget takes no configurable fields.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Field
                  </th>
                  <th className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Type
                  </th>
                  <th className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    Default
                  </th>
                  <th className="px-3 py-1.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    <span className="sr-only">Copy data attribute</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => (
                  <tr key={field.key} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-1.5 align-top">
                      <span className="font-mono text-xs text-fg">{field.key}</span>
                      {!field.optional && field.default === null && (
                        <span className="ml-1 text-[0.65rem] font-medium uppercase text-destructive">
                          required
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 align-top">
                      <span className="font-mono text-xs text-muted-fg">{field.type}</span>
                    </td>
                    <td className="px-3 py-1.5 align-top font-mono text-xs text-muted-fg">
                      {field.default ?? (field.optional ? '—' : '')}
                    </td>
                    <td className="px-3 py-1.5 text-right align-top">
                      <CopyAttrButton field={field} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * Per-row "copy data-*" affordance: writes the field's ready-to-paste `data-*`
 * attribute (e.g. `data-per-page="12"`) to the clipboard, mirroring the embed /
 * share copy pattern (transient "Copied" state). The accessible name names the
 * exact attribute so screen-reader users know which row each control copies.
 */
function CopyAttrButton({ field }: { field: SchemaField }) {
  const { copied, flash } = useCopiedFlash();
  const attr = `data-${camelToKebab(field.key)}`;

  const copy = () => {
    void navigator.clipboard?.writeText(dataAttrSnippet(field)).then(flash);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={copy}
      aria-label={`Copy ${attr} attribute`}
      title={`Copy ${dataAttrSnippet(field)}`}
      className="h-6 px-1.5 font-mono text-[0.65rem] text-muted-fg"
    >
      {copied ? 'Copied' : `Copy ${attr}`}
    </Button>
  );
}
