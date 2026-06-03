import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTemplate } from './scaffold';

/** Template-relative path of the MDX doc stub. It lives under `docs/` in the
 * template but is NOT a widget file — the CLI places it at the repo's
 * `docs/widgets/<name>.mdx`, so `writeScaffold` skips it. */
export const DOC_TEMPLATE_KEY = 'docs/widget.mdx';

const TEMPLATES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../templates/widget',
);

/** Read every file under `templates/widget/` into a relPath → contents map
 * (placeholders intact). Side-effecting (reads disk); pure rendering is in
 * scaffold.ts. */
export function loadWidgetTemplate(): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else {
        const rel = path.relative(TEMPLATES_DIR, abs).split(path.sep).join('/');
        out[rel] = readFileSync(abs, 'utf8');
      }
    }
  };
  walk(TEMPLATES_DIR);
  return out;
}

/** Render the template for `name` and write the widget files to `targetDir`.
 * The MDX doc stub (DOC_TEMPLATE_KEY) is excluded — it is not a widget file;
 * the CLI places it under the repo's `docs/widgets/`. */
export function writeScaffold(
  targetDir: string,
  name: string,
  template: Record<string, string>,
): void {
  const rendered = renderTemplate(name, template);
  for (const [rel, contents] of Object.entries(rendered)) {
    if (rel === DOC_TEMPLATE_KEY) continue;
    const dest = path.join(targetDir, rel);
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, contents);
  }
}
