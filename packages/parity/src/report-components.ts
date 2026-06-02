import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { compileComponentDevCss, compileComponentProdCss, repoRoot } from './pipelines.ts';
import { diffCss } from './diff.ts';

// H3: a @perimeter/ui component lives in two CSS worlds. In the studio gallery,
// `ComponentPreview` renders it in the LIGHT DOM under the studio's full Tailwind
// sheet (dev side). Inside a shipped widget it is styled by the widget production
// pipeline (content = ui src only, + rem→px) and injected into a shadow root
// (prod side). This diffs those two sheets and records the structural facts the
// CSS diff cannot see.

const reportsDir = path.join(repoRoot, 'packages/parity/reports');
mkdirSync(reportsDir, { recursive: true });

const [dev, prod] = await Promise.all([compileComponentDevCss(), compileComponentProdCss()]);
const d = diffCss(dev, prod);
const remPx = d.valueDiffs.filter((v) => v.kind === 'rem-px');
const other = d.valueDiffs.filter((v) => v.kind === 'other');

const lines = [
  `# Components-path divergence — \`@perimeter/ui\` in studio gallery vs shipped widget (H3)`,
  '',
  `Dev = studio light-DOM pipeline (\`ComponentPreview\`): studio \`tailwind.config.ts\``,
  `(content scans studio src + \`widgets/*\` + \`packages/ui/src\`) processing the studio's`,
  `own \`src/styles.css\`, no rem→px.`,
  '',
  `Prod = widget production pipeline: content = \`packages/ui/src\` only, + the real`,
  `\`remToPxPlugin\` from \`widgetConfig()\` — what those classes become inside a shipped widget.`,
  '',
  `| metric | count |`,
  `| --- | --- |`,
  `| selectors only in dev (studio gallery) | ${d.onlyInA.length} |`,
  `| selectors only in prod (shipped widget) | ${d.onlyInB.length} |`,
  `| value diffs, rem→px (H1) | ${remPx.length} |`,
  `| value diffs, other | ${other.length} |`,
  '',
  `## Structural divergence (hand-written; not measurable from CSS text)`,
  '',
  `These are the parts of H3 the CSS differ above cannot see — they are properties of`,
  `the DOM and injection path, not of the compiled stylesheet:`,
  '',
  `- **Light DOM vs shadow root.** \`ComponentPreview\` renders \`@perimeter/ui\` exports`,
  `  directly into the studio document (light DOM). In a shipped widget the same`,
  `  components render inside a closed shadow root created by \`mount()\`.`,
  `- **Studio preflight + base styles leak in (a), never in (b).** Tailwind preflight`,
  `  and the studio \`index.html\` base styles apply to the gallery's light DOM in (a).`,
  `  Inside a widget's shadow root those host/document rules do not cross the boundary,`,
  `  so (b) gets none of them.`,
  `- **Token delivery.** In (a) tokens arrive as an inline \`style\` object`,
  `  (\`--<token>\` CSS variables) on a wrapper \`div\` in \`ComponentPreview\`. In (b)`,
  `  tokens arrive as a \`:host\` CSS-variable sheet injected into the shadow root by`,
  `  \`applyStyles()\`.`,
  `- **No \`rewriteRootToHost\` in (a).** The widget mount path rewrites \`:root\`/\`html\``,
  `  selectors to \`:host\` before injection; the light-DOM gallery path never runs it.`,
  '',
  `## Selectors only in dev (studio gallery — studio src + html + widgets scan noise)`,
  ...d.onlyInA.slice(0, 200).map((s) => `- \`${s}\``),
  '',
  `## Selectors only in prod (shipped widget)`,
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

const file = path.join(reportsDir, 'components-path.md');
writeFileSync(file, lines.join('\n'));
console.log(`wrote ${file}`);
