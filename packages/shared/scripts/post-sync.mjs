/**
 * Post-sync script: rewrites @/ path aliases to relative imports.
 * Run automatically after `pnpm sync:style`.
 *
 * The shadcn CLI writes components with @/ aliases matching components.json.
 * The shared package requires relative imports for cross-package consumption.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative, sep } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..', 'src');

/** Map @/ alias prefixes to their actual directory under src/ */
const ALIAS_MAP = {
    '@/lib/': 'lib/',
    '@/components/ui/perimeter/': 'components/ui/perimeter/',
    '@/components/ui/': 'components/ui/',
    '@/components/': 'components/',
};

/**
 * Convert an @/ import to a relative import based on the importing file's location.
 */
function resolveAlias(importPath, fromFile) {
    for (const [alias, dir] of Object.entries(ALIAS_MAP)) {
        if (importPath.startsWith(alias)) {
            const remainder = importPath.slice(alias.length);
            const targetPath = join(SRC_DIR, dir, remainder);
            const fromDir = dirname(fromFile);
            let rel = relative(fromDir, targetPath);
            // Ensure it starts with ./ or ../
            if (!rel.startsWith('.')) rel = './' + rel;
            // Normalize to forward slashes
            return rel.split(sep).join('/');
        }
    }
    return null;
}

/**
 * Rewrite all @/ imports in a file to relative paths.
 */
function rewriteFile(filePath) {
    let content = readFileSync(filePath, 'utf-8');
    let changed = false;

    // Match import statements with @/ paths (both import and import type)
    content = content.replace(
        /(from\s+['"])(@\/[^'"]+)(['"])/g,
        (_match, prefix, importPath, suffix) => {
            const resolved = resolveAlias(importPath, filePath);
            if (resolved) {
                changed = true;
                return `${prefix}${resolved}${suffix}`;
            }
            return _match;
        },
    );

    if (changed) {
        writeFileSync(filePath, content, 'utf-8');
        console.log(`  Rewrote imports: ${filePath}`);
    }
}

/**
 * Recursively find all .tsx/.ts files in a directory.
 */
function findFiles(dir, ext = ['.tsx', '.ts']) {
    const results = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const stat = statSync(full);
        if (stat.isDirectory()) {
            results.push(...findFiles(full, ext));
        } else if (ext.some((e) => full.endsWith(e))) {
            results.push(full);
        }
    }
    return results;
}

// Rewrite synced component directories
const dirs = [
    join(SRC_DIR, 'components', 'ui', 'perimeter'),
    join(SRC_DIR, 'components', 'ui'),
];

console.log('Post-sync: rewriting @/ imports to relative paths...');
for (const dir of dirs) {
    for (const file of findFiles(dir)) {
        rewriteFile(file);
    }
}
console.log('Post-sync: done.');
