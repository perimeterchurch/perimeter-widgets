/**
 * Component sync script: pulls components from the style registry
 * via shadcn CLI, then rewrites @/ imports to relative paths.
 *
 * Usage: node scripts/sync-components.mjs
 *
 * This script:
 * 1. Backs up base UI wrappers (CLI may overwrite them)
 * 2. Runs shadcn CLI to pull 20 components from the style registry
 * 3. Restores base UI wrappers
 * 4. Runs post-sync import rewriter
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHARED_DIR = join(__dirname, '..');
const UI_DIR = join(SHARED_DIR, 'src', 'components', 'ui');

/** Components to pull from the style registry */
const COMPONENTS = [
    'avatar',
    'badge',
    'button',
    'calendar',
    'card',
    'checkbox',
    'combobox',
    'command',
    'dialog',
    'dropdown-menu',
    'empty',
    'input',
    'label',
    'multi-combobox',
    'pagination',
    'progress',
    'radio-group',
    'scroll-area',
    'select',
    'separator',
    'skeleton',
    'spinner',
    'switch',
    'tabs',
    'textarea',
    'tooltip',
];

/**
 * Base UI wrapper files that must NOT be overwritten by the CLI.
 * These are widget-specific wrappers used by synced registry components
 * via @/components/ui/* imports.
 */
const PROTECTED_FILES = [
    'button.tsx',
    'dialog.tsx',
    'input.tsx',
    'textarea.tsx',
    'input-group.tsx',
];

function backupProtectedFiles() {
    const backups = new Map();
    for (const file of PROTECTED_FILES) {
        const path = join(UI_DIR, file);
        if (existsSync(path)) {
            backups.set(file, readFileSync(path, 'utf-8'));
        }
    }
    return backups;
}

function restoreProtectedFiles(backups) {
    for (const [file, content] of backups) {
        writeFileSync(join(UI_DIR, file), content, 'utf-8');
    }
    if (backups.size > 0) {
        console.log(
            `  Restored ${backups.size} protected files: ${[...backups.keys()].join(', ')}`,
        );
    }
}

function main() {
    console.log('Syncing components from style registry...');

    // Step 1: Backup protected files
    const backups = backupProtectedFiles();

    // Step 2: Pull components via shadcn CLI
    const names = COMPONENTS.map((c) => `@perimeter/${c}`).join(' ');
    const cmd = `pnpm dlx shadcn@latest add ${names} --yes --overwrite -c packages/shared`;

    console.log(`  Running: ${cmd}`);
    try {
        execSync(cmd, {
            cwd: join(SHARED_DIR, '..', '..'),
            stdio: 'inherit',
        });
    } catch {
        console.error('shadcn CLI failed. Check output above.');
        process.exit(1);
    }

    // Step 3: Restore protected files
    restoreProtectedFiles(backups);

    // Step 4: Clean up duplicate input-group if CLI created one in perimeter/
    const dupeInputGroup = join(UI_DIR, 'perimeter', 'input-group.tsx');
    if (existsSync(dupeInputGroup)) {
        unlinkSync(dupeInputGroup);
        console.log('  Removed duplicate perimeter/input-group.tsx');
    }

    // Step 5: Rewrite @/ imports to relative paths
    console.log('  Running post-sync import rewriter...');
    execSync('node scripts/post-sync.mjs', {
        cwd: SHARED_DIR,
        stdio: 'inherit',
    });

    console.log('Component sync complete.');
}

main();
