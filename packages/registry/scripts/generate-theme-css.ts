import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

interface ThemeFile {
    name: string;
    cssVars: {
        light: Record<string, string>;
        dark: Record<string, string>;
    };
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REGISTRY_ROOT = resolve(SCRIPT_DIR, '..');
const MONOREPO_ROOT = resolve(REGISTRY_ROOT, '../..');
const THEMES_DIR = join(REGISTRY_ROOT, 'themes');
const SITE_GLOBALS = join(MONOREPO_ROOT, 'apps/site/src/app/globals.css');
const SHARED_BASE = join(MONOREPO_ROOT, 'packages/shared/src/styles/base.css');

const SITE_START = '/* @generated-themes-start */';
const SITE_END = '/* @generated-themes-end */';
const SHARED_START = '/* @sync:tokens-start */';
const SHARED_END = '/* @sync:tokens-end */';

function cssBlock(
    selector: string,
    vars: Record<string, string>,
    indent = '    ',
): string {
    const entries = Object.entries(vars)
        .map(([k, v]) => `${indent}--${k}: ${v};`)
        .join('\n');
    return `${selector} {\n${entries}\n}`;
}

interface LoadedTheme extends ThemeFile {
    slug: string;
}

// Theme files declare `name` with a `-theme` suffix (e.g. "default-theme"); the
// slug we use in selectors strips that suffix so the default theme is "default",
// "metrics-theme" becomes "metrics", etc.
async function readThemes(): Promise<LoadedTheme[]> {
    const files = (await readdir(THEMES_DIR))
        .filter((f) => f.endsWith('.json'))
        .sort();
    return Promise.all(
        files.map(async (f) => {
            const theme: ThemeFile = JSON.parse(
                await readFile(join(THEMES_DIR, f), 'utf-8'),
            );
            const slug = f.replace(/\.json$/, '').replace(/-theme$/, '');
            return { ...theme, slug };
        }),
    );
}

// The site and shared blocks intentionally use different selectors:
//   - Site (this file): `.dark` class + `:host([data-mode="dark"])` — matches the
//     showcase app's theme-mode-toggle convention inherited from style.
//   - Shared (below): `:host([data-theme='dark'])` — matches the widget
//     runtime's shadow-host attribute set by packages/shared/src/shadow-dom/mount.tsx.
// Two consumers, two conventions; both CSS blocks are regenerated from the same
// tokens so the values stay in lockstep even though the selectors differ.
function buildSiteBlock(themes: LoadedTheme[]): string {
    const defaultTheme = themes.find((t) => t.slug === 'default');
    if (!defaultTheme) throw new Error('themes/default.json is required');

    const blocks: string[] = [];
    blocks.push(cssBlock(':root', defaultTheme.cssVars.light, '  '));
    blocks.push('');
    blocks.push(cssBlock('.light', defaultTheme.cssVars.light, '  '));
    blocks.push('');
    blocks.push(cssBlock('.dark', defaultTheme.cssVars.dark, '  '));
    blocks.push('');
    blocks.push(cssBlock(':host', defaultTheme.cssVars.light, '  '));
    blocks.push('');
    blocks.push(
        cssBlock(':host([data-mode="dark"])', defaultTheme.cssVars.dark, '  '),
    );

    for (const theme of themes) {
        if (theme.slug === 'default') continue;
        const { slug } = theme;
        blocks.push('');
        blocks.push(
            cssBlock(`[data-theme="${slug}"]`, theme.cssVars.light, '  '),
        );
        blocks.push('');
        blocks.push(
            cssBlock(`[data-theme="${slug}"].dark`, theme.cssVars.dark, '  '),
        );
        blocks.push('');
        blocks.push(
            cssBlock(
                `:host([data-theme="${slug}"])`,
                theme.cssVars.light,
                '  ',
            ),
        );
        blocks.push('');
        blocks.push(
            cssBlock(
                `:host([data-theme="${slug}"][data-mode="dark"])`,
                theme.cssVars.dark,
                '  ',
            ),
        );
    }

    return blocks.join('\n');
}

function buildSharedBlock(themes: LoadedTheme[]): string {
    const defaultTheme = themes.find((t) => t.slug === 'default');
    if (!defaultTheme) throw new Error('themes/default.json is required');

    const lightEntries = Object.entries(defaultTheme.cssVars.light)
        .map(([k, v]) => `    --${k}: ${v};`)
        .join('\n');
    const darkEntries = Object.entries(defaultTheme.cssVars.dark)
        .map(([k, v]) => `    --${k}: ${v};`)
        .join('\n');

    return [
        ':root,',
        ':host {',
        lightEntries,
        '}',
        '',
        '.dark,',
        ":host([data-theme='dark']) {",
        darkEntries,
        '}',
    ].join('\n');
}

async function injectBetweenMarkers(
    file: string,
    start: string,
    end: string,
    block: string,
): Promise<void> {
    const source = await readFile(file, 'utf-8');
    const startIdx = source.indexOf(start);
    const endIdx = source.indexOf(end);
    if (startIdx === -1 || endIdx === -1) {
        throw new Error(
            `${file} is missing theme markers (${start} / ${end}). `
                + `Add both markers manually before running this script.`,
        );
    }
    const before = source.slice(0, startIdx + start.length);
    const after = source.slice(endIdx);
    await writeFile(file, `${before}\n${block}\n${after}`);
}

function assertTokenParity(themes: LoadedTheme[]): void {
    const defaultTheme = themes.find((t) => t.slug === 'default');
    if (!defaultTheme) throw new Error('themes/default.json is required');

    const lightKeys = Object.keys(defaultTheme.cssVars.light).sort();
    const darkKeys = Object.keys(defaultTheme.cssVars.dark).sort();
    if (JSON.stringify(lightKeys) !== JSON.stringify(darkKeys)) {
        throw new Error(
            `Token key drift: default theme's light and dark blocks have different keys.\n`
                + `  Light-only: ${lightKeys.filter((k) => !darkKeys.includes(k)).join(', ')}\n`
                + `  Dark-only: ${darkKeys.filter((k) => !lightKeys.includes(k)).join(', ')}`,
        );
    }
}

async function main(): Promise<void> {
    const themes = await readThemes();
    assertTokenParity(themes);

    const siteBlock = buildSiteBlock(themes);
    const sharedBlock = buildSharedBlock(themes);

    await injectBetweenMarkers(SITE_GLOBALS, SITE_START, SITE_END, siteBlock);
    await injectBetweenMarkers(
        SHARED_BASE,
        SHARED_START,
        SHARED_END,
        sharedBlock,
    );

    execSync(`pnpm prettier --write "${SITE_GLOBALS}" "${SHARED_BASE}"`, {
        stdio: 'ignore',
    });

    console.log(
        `Injected ${themes.length} theme(s) into:\n`
            + `  ${SITE_GLOBALS}\n`
            + `  ${SHARED_BASE}`,
    );
}

main().catch((err) => {
    console.error('Failed to generate theme CSS:', err.message ?? err);
    process.exit(1);
});
