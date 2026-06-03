export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** A widget name must be kebab-case and not already taken. */
export function validateWidgetName(name: string, existing: string[]): ValidationResult {
  if (!KEBAB.test(name))
    return { ok: false, reason: `"${name}" must be kebab-case (e.g. event-list)` };
  if (existing.includes(name)) return { ok: false, reason: `widgets/${name} already exists` };
  return { ok: true };
}

/** Substitute __NAME__ in every template file's contents. Pure: takes the raw
 * template map (relPath → contents), returns the rendered map. */
export function renderTemplate(
  name: string,
  template: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [rel, contents] of Object.entries(template)) {
    out[rel] = contents.replaceAll('__NAME__', name);
  }
  return out;
}
