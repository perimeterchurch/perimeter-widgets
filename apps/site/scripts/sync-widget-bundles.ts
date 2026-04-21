/**
 * Sync widget IIFE bundles into the site's public/widget-bundles/ so the
 * /widgets preview can load them via <script> tags.
 *
 * Default: copy each `<repo>/dist/<widget>/<widget>.js` into
 *          `apps/site/public/widget-bundles/<widget>.js` (used by `next build`).
 * --link:  symlink `apps/site/public/widget-bundles/` → `<repo>/dist/` so
 *          `vite build --watch` rebuilds are picked up immediately in dev.
 */
import {
    copyFileSync,
    existsSync,
    lstatSync,
    mkdirSync,
    readdirSync,
    rmSync,
    symlinkSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(SCRIPT_DIR, '..');
const MONOREPO_ROOT = resolve(SITE_ROOT, '../..');
const DIST_DIR = join(MONOREPO_ROOT, 'dist');
const OUT_DIR = join(SITE_ROOT, 'public/widget-bundles');

const mode = process.argv.includes('--link') ? 'link' : 'copy';

function clean() {
    if (!existsSync(OUT_DIR)) return;
    // If it's a symlink we want to unlink; if it's a dir we want rm -rf.
    const stat = lstatSync(OUT_DIR);
    if (stat.isSymbolicLink()) rmSync(OUT_DIR);
    else rmSync(OUT_DIR, { recursive: true, force: true });
}

function linkMode() {
    clean();
    mkdirSync(dirname(OUT_DIR), { recursive: true });
    symlinkSync(DIST_DIR, OUT_DIR, 'dir');
    console.log(`Linked ${OUT_DIR} → ${DIST_DIR}`);
}

function copyMode() {
    clean();
    mkdirSync(OUT_DIR, { recursive: true });

    if (!existsSync(DIST_DIR)) {
        console.warn(
            `[sync-widget-bundles] ${DIST_DIR} does not exist. Build widgets first with 'pnpm -w build'.`,
        );
        return;
    }

    const widgetDirs = readdirSync(DIST_DIR, { withFileTypes: true }).filter(
        (d) => d.isDirectory(),
    );

    let count = 0;
    for (const dir of widgetDirs) {
        const bundleName = `${dir.name}.js`;
        const src = join(DIST_DIR, dir.name, bundleName);
        if (!existsSync(src)) continue;
        const dest = join(OUT_DIR, bundleName);
        copyFileSync(src, dest);
        count++;
    }
    console.log(`Copied ${count} widget bundle(s) to ${OUT_DIR}`);
}

if (mode === 'link') linkMode();
else copyMode();
