import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { compileDevCss, compileProdCss, repoRoot } from './pipelines.ts';
import { diffCss } from './diff.ts';
import { uiAttributableSelectors } from './ui-selectors.ts';

const widgets = process.argv.slice(2);
if (widgets.length === 0) {
  console.error('usage: pnpm parity:css <widget-name> [...more]');
  process.exit(1);
}

const reportsDir = path.join(repoRoot, 'packages/parity/reports');
mkdirSync(reportsDir, { recursive: true });

for (const name of widgets) {
  const dir = path.join(repoRoot, 'widgets', name);
  const [dev, prod] = await Promise.all([compileDevCss(dir), compileProdCss(dir)]);
  const d = diffCss(dev, prod);
  const devOnlyUi = await uiAttributableSelectors(d.onlyInA);
  const remPx = d.valueDiffs.filter((v) => v.kind === 'rem-px');
  const other = d.valueDiffs.filter((v) => v.kind === 'other');

  const lines = [
    `# CSS pipeline diff — \`${name}\` (dev=studio pipeline, prod=widgetConfig pipeline)`,
    '',
    `| metric | count |`,
    `| --- | --- |`,
    `| selectors only in dev | ${d.onlyInA.length} |`,
    `| …of which attributable to @perimeter/ui (H2) | ${devOnlyUi.length} |`,
    `| selectors only in prod | ${d.onlyInB.length} |`,
    `| value diffs, rem→px (H1) | ${remPx.length} |`,
    `| value diffs, other | ${other.length} |`,
    '',
    `## Selectors only in dev attributable to @perimeter/ui (missing from shipped bundle)`,
    ...devOnlyUi.map((s) => `- \`${s}\``),
    '',
    `## Other selectors only in dev (superset noise: studio src, html scan — interpret manually)`,
    ...d.onlyInA
      .filter((s) => !devOnlyUi.includes(s))
      .slice(0, 200)
      .map((s) => `- \`${s}\``),
    '',
    `## Selectors only in prod`,
    ...d.onlyInB.map((s) => `- \`${s}\``),
    '',
    `## Non-rem value diffs (each needs a human verdict)`,
    ...other.map((v) => `- \`${v.selector}\` \`${v.prop}\`: dev=\`${v.a}\` prod=\`${v.b}\``),
    '',
    `## rem→px value diffs (sample, first 20 of ${remPx.length})`,
    ...remPx
      .slice(0, 20)
      .map((v) => `- \`${v.selector}\` \`${v.prop}\`: dev=\`${v.a}\` prod=\`${v.b}\``),
    '',
  ];
  const file = path.join(reportsDir, `css-pipeline-${name}.md`);
  writeFileSync(file, lines.join('\n'));
  console.log(`wrote ${file}`);
}
