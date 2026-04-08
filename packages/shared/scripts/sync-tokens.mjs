/**
 * Token sync script: fetches theme tokens from the style registry
 * and regenerates the CSS custom properties section of base.css.
 *
 * Usage: node scripts/sync-tokens.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_CSS_PATH = join(__dirname, '..', 'src', 'styles', 'base.css');
const THEME_URL = 'https://style.perimeter.org/r/default-theme.json';

const START_MARKER = '/* @sync:tokens-start */';
const END_MARKER = '/* @sync:tokens-end */';

/**
 * Generate CSS custom property declarations from a token object.
 */
function generateVars(tokens, indent = '    ') {
    return Object.entries(tokens)
        .map(([key, value]) => `${indent}--${key}: ${value};`)
        .join('\n');
}

async function main() {
    console.log(`Fetching theme from ${THEME_URL}...`);
    const response = await fetch(THEME_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch theme: ${response.status} ${response.statusText}`);
    }

    const themeData = await response.json();
    const { light, dark } = themeData.cssVars;

    if (!light || !dark) {
        throw new Error('Theme JSON missing cssVars.light or cssVars.dark');
    }

    console.log(`  Light tokens: ${Object.keys(light).length}`);
    console.log(`  Dark tokens: ${Object.keys(dark).length}`);

    // Generate the token CSS block with shadow DOM selectors
    const tokenBlock = [
        START_MARKER,
        ':root,',
        ':host {',
        generateVars(light),
        '}',
        '',
        '.dark,',
        ':host([data-theme="dark"]) {',
        generateVars(dark),
        '}',
        END_MARKER,
    ].join('\n');

    // Read base.css and replace content between markers
    const css = readFileSync(BASE_CSS_PATH, 'utf-8');
    const startIdx = css.indexOf(START_MARKER);
    const endIdx = css.indexOf(END_MARKER);

    if (startIdx === -1 || endIdx === -1) {
        throw new Error(
            `Markers not found in base.css. Expected ${START_MARKER} and ${END_MARKER}`,
        );
    }

    const before = css.slice(0, startIdx);
    const after = css.slice(endIdx + END_MARKER.length);
    const newCss = before + tokenBlock + after;

    writeFileSync(BASE_CSS_PATH, newCss, 'utf-8');
    console.log('Token sync complete. Updated base.css.');
}

main().catch((err) => {
    console.error('Token sync failed:', err.message);
    process.exit(1);
});
