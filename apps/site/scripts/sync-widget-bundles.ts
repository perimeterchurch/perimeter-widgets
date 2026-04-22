/**
 * Sync widget IIFE bundles into the site's public/widget-bundles/ so the
 * /widgets preview can load them via <script> tags at the flat URL
 * `/widget-bundles/<widget>.js`.
 *
 * Both modes produce the same flat layout. Source for each widget is
 * `<repo>/dist/<widget>/<widget>.js`; destination is always
 * `apps/site/public/widget-bundles/<widget>.js`.
 *
 * Default: copy each source file (used by `next build`).
 * --link:  per-widget symlink so `vite build --watch` rebuilds are picked up
 *          immediately in dev without re-running this script.
 */
import {
    copyFileSync,
    existsSync,
    lstatSync,
    mkdirSync,
    readdirSync,
    rmSync,
    symlinkSync,
    unlinkSync,
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
    // Use lstatSync (not statSync) so we check the symlink itself, not its target.
    // unlinkSync for symlinks removes the link without touching the target;
    // rmSync with recursive handles a real directory.
    const stat = lstatSync(OUT_DIR);
    if (stat.isSymbolicLink()) unlinkSync(OUT_DIR);
    else rmSync(OUT_DIR, { recursive: true, force: true });
}

/** Each widget's source bundle path, keyed by widget id. */
function findWidgetBundles(): { id: string; src: string }[] {
    if (!existsSync(DIST_DIR)) return [];
    return readdirSync(DIST_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => ({ id: d.name, src: join(DIST_DIR, d.name, `${d.name}.js`) }))
        .filter((w) => existsSync(w.src));
}

function warnIfNoDist() {
    if (existsSync(DIST_DIR)) return;
    console.warn(
        `[sync-widget-bundles] ${DIST_DIR} does not exist. Build widgets first with 'pnpm -w build'.`,
    );
}

function linkMode() {
    clean();
    mkdirSync(OUT_DIR, { recursive: true });
    warnIfNoDist();

    const widgets = findWidgetBundles();
    for (const w of widgets) {
        symlinkSync(w.src, join(OUT_DIR, `${w.id}.js`), 'file');
    }
    console.log(`Linked ${widgets.length} widget bundle(s) into ${OUT_DIR}`);
}

function copyMode() {
    clean();
    mkdirSync(OUT_DIR, { recursive: true });
    warnIfNoDist();

    const widgets = findWidgetBundles();
    for (const w of widgets) {
        copyFileSync(w.src, join(OUT_DIR, `${w.id}.js`));
    }
    console.log(`Copied ${widgets.length} widget bundle(s) to ${OUT_DIR}`);
}

if (mode === 'link') linkMode();
else copyMode();
