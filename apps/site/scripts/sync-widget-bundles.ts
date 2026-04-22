/**
 * Copy built widget IIFE bundles into the site's public/widget-bundles/ for
 * the production static export. The /widgets preview loads each widget at
 * the flat URL `/widget-bundles/<widget>.js`.
 *
 * Used only by `next build`. Dev mode doesn't need this script — the
 * widget's `dev` script sets WIDGET_DEV_OUT_DIR so `vite build --watch`
 * writes directly into apps/site/public/widget-bundles/.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(SCRIPT_DIR, '..');
const MONOREPO_ROOT = resolve(SITE_ROOT, '../..');
const DIST_DIR = join(MONOREPO_ROOT, 'dist');
const OUT_DIR = join(SITE_ROOT, 'public/widget-bundles');

if (!existsSync(DIST_DIR)) {
    console.warn(
        `[sync-widget-bundles] ${DIST_DIR} does not exist. Build widgets first with 'pnpm -w build'.`,
    );
    process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });

const widgets = readdirSync(DIST_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ id: d.name, src: join(DIST_DIR, d.name, `${d.name}.js`) }))
    .filter((w) => existsSync(w.src));

for (const w of widgets) {
    copyFileSync(w.src, join(OUT_DIR, `${w.id}.js`));
}

console.log(`Copied ${widgets.length} widget bundle(s) to ${OUT_DIR}`);
