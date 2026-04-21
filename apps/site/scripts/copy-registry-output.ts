/**
 * Copy the registry package's shadcn-build output into the site's public/r/.
 * Runs in the site's build chain after `pnpm --filter @perimeter-widgets/registry build`.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(SCRIPT_DIR, '..');
const REGISTRY_OUTPUT = resolve(SITE_ROOT, '../../packages/registry/public/r');
const SITE_OUTPUT = join(SITE_ROOT, 'public/r');

if (!existsSync(REGISTRY_OUTPUT)) {
    console.error(
        `Registry output not found at ${REGISTRY_OUTPUT}. `
            + `Run 'pnpm --filter @perimeter-widgets/registry build' first.`,
    );
    process.exit(1);
}

if (existsSync(SITE_OUTPUT)) {
    rmSync(SITE_OUTPUT, { recursive: true, force: true });
}
mkdirSync(SITE_OUTPUT, { recursive: true });
cpSync(REGISTRY_OUTPUT, SITE_OUTPUT, { recursive: true });

const count = readdirSync(SITE_OUTPUT).filter((f) =>
    f.endsWith('.json'),
).length;
console.log(`Copied ${count} registry JSON files to ${SITE_OUTPUT}`);
