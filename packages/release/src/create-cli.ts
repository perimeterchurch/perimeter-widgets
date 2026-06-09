import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateWidgetName, renderTemplate } from './scaffold';
import { loadWidgetTemplate, writeScaffold, DOC_TEMPLATE_KEY } from './scaffold-fs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function main(): void {
  const name = process.argv[2];
  if (!name) throw new Error('usage: pnpm create-widget <widget-name>');

  const widgetsDir = path.join(REPO, 'widgets');
  const existing = readdirSync(widgetsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const valid = validateWidgetName(name, existing);
  if (!valid.ok) throw new Error(valid.reason);

  const template = loadWidgetTemplate();

  // Widget files → widgets/<name>/ (doc stub excluded by writeScaffold).
  writeScaffold(path.join(widgetsDir, name), name, template);

  // Doc stub → docs/widgets/<name>.mdx.
  const doc = renderTemplate(name, template)[DOC_TEMPLATE_KEY];
  if (doc) {
    const docsDir = path.join(REPO, 'docs', 'widgets');
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(path.join(docsDir, `${name}.mdx`), doc);
  }

  // Pick up the new workspace package + write node_modules links / lockfile.
  execSync('pnpm install', { cwd: REPO, stdio: 'inherit' });

  console.log(`\nScaffolded widget "${name}".`);
  console.log(`  widget:  widgets/${name}`);
  console.log(`  doc:     docs/widgets/${name}.mdx`);
  console.log('\nNext steps:');
  console.log('  - Start the studio:  pnpm --filter @perimeter/studio dev');
  console.log(`  - Edit the schema + UI in widgets/${name}/src/`);
  console.log('  - Quality gate:      pnpm format && pnpm quality');
  console.log('  - Commit the updated pnpm-lock.yaml (the release clean-tree guard needs it).');
}

main();
