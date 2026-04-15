# Style Registry Sync Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hand-copied components and tokens in perimeter-widgets with registry-synced versions from the style project, establishing style as the single source of truth.

**Architecture:** Add a `components.json` pointing to `style.perimeter.org/r`, a `sync:style` script that pulls 21 components via shadcn CLI + rewrites imports, and a `sync:tokens` script that fetches theme JSON and regenerates CSS token vars with shadow DOM selectors. Portal-aware components (6) stay widget-owned.

**Tech Stack:** shadcn CLI 3.0+, Node.js scripts (ESM), Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-04-08-style-registry-sync-design.md`

---

## File Map

| Action          | File                                                       | Responsibility                                                      |
| --------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| Create          | `packages/shared/components.json`                          | shadcn consumer config pointing to style registry                   |
| Create          | `packages/shared/scripts/post-sync.mjs`                    | Rewrite `@/` imports to relative paths after shadcn pull            |
| Create          | `packages/shared/scripts/sync-tokens.mjs`                  | Fetch theme JSON, generate CSS token vars with shadow DOM selectors |
| Modify          | `packages/shared/package.json`                             | Add `sync:style` and `sync:tokens` scripts                          |
| Modify          | `package.json` (root)                                      | Add root `sync:style` and `sync:tokens` pass-throughs               |
| Modify          | `packages/shared/src/styles/base.css`                      | Add sync markers around token section                               |
| Modify          | `packages/shared/src/components/index.ts`                  | Update `input-group` export path if needed after sync               |
| Delete+Recreate | 21 files in `packages/shared/src/components/ui/perimeter/` | Replaced by registry-pulled versions                                |

---

## Chunk 1: Sync Infrastructure

### Task 1: Add components.json

**Files:**

- Create: `packages/shared/components.json`

- [ ] **Step 1: Create the shadcn consumer config**

Create `packages/shared/components.json`:

```json
{
    "$schema": "https://ui.shadcn.com/schema.json",
    "style": "base-nova",
    "tsx": true,
    "tailwind": {
        "config": "",
        "css": "src/styles/base.css",
        "cssVariables": true
    },
    "aliases": {
        "utils": "@/lib/utils",
        "ui": "@/components/ui"
    },
    "registries": {
        "@perimeter": "https://style.perimeter.org/r/{name}.json"
    }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
git add packages/shared/components.json
git commit -m "chore: add shadcn components.json for style registry consumption"
```

---

### Task 2: Create post-sync import rewriter

**Files:**

- Create: `packages/shared/scripts/post-sync.mjs`

The shadcn CLI writes components with `@/` path aliases (e.g., `@/lib/utils`, `@/components/ui/perimeter/button`). The shared package uses relative imports because it's consumed cross-package. This script rewrites all `@/` imports to relative paths after every sync.

- [ ] **Step 1: Write the post-sync script**

Create `packages/shared/scripts/post-sync.mjs`:

```javascript
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
```

- [ ] **Step 2: Test the script manually**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets/packages/shared && node scripts/post-sync.mjs`
Expected: `Post-sync: rewriting @/ imports to relative paths...` then `Post-sync: done.` (no rewrites yet since files still have relative imports)

- [ ] **Step 3: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
git add packages/shared/scripts/post-sync.mjs
git commit -m "feat: add post-sync script to rewrite @/ imports to relative paths"
```

---

### Task 3: Create token sync script

**Files:**

- Create: `packages/shared/scripts/sync-tokens.mjs`
- Modify: `packages/shared/src/styles/base.css` (add markers)

- [ ] **Step 1: Add markers to base.css**

In `packages/shared/src/styles/base.css`, wrap the token section (the `:root, :host { ... }` and `.dark, :host([data-theme="dark"]) { ... }` blocks) with markers.

Replace the line `:root,` (around line 81) through the closing `}` of the dark block (around line 165) with:

```css
/* @sync:tokens-start */
:root,
:host {
    --radius: 0.625rem;
    ... (keep existing token values unchanged)
}

.dark,
:host([data-theme="dark"]) {
    ... (keep existing dark values unchanged)
}
/* @sync:tokens-end */
```

The markers go around the existing content — don't change any token values in this step.

- [ ] **Step 2: Write the sync-tokens script**

Create `packages/shared/scripts/sync-tokens.mjs`:

```javascript
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
        throw new Error(
            `Failed to fetch theme: ${response.status} ${response.statusText}`,
        );
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
```

- [ ] **Step 3: Test the script**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets/packages/shared && node scripts/sync-tokens.mjs`
Expected: Fetches theme, reports token counts, updates base.css between markers. Verify base.css still has the `:host` reset, `@theme inline` block, and animations above/below the markers.

- [ ] **Step 4: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
git add packages/shared/scripts/sync-tokens.mjs packages/shared/src/styles/base.css
git commit -m "feat: add token sync script with marker-based CSS replacement"
```

---

### Task 4: Add sync scripts to package.json

**Files:**

- Modify: `packages/shared/package.json`
- Modify: `package.json` (root)

- [ ] **Step 1: Add scripts to shared package.json**

In `packages/shared/package.json`, add to the `"scripts"` object:

```json
"sync:style": "pnpm dlx shadcn@latest add @perimeter/avatar @perimeter/badge @perimeter/button @perimeter/calendar @perimeter/card @perimeter/checkbox @perimeter/command @perimeter/empty @perimeter/input @perimeter/input-group @perimeter/label @perimeter/pagination @perimeter/progress @perimeter/radio-group @perimeter/scroll-area @perimeter/separator @perimeter/skeleton @perimeter/spinner @perimeter/switch @perimeter/tabs @perimeter/textarea && node scripts/post-sync.mjs",
"sync:tokens": "node scripts/sync-tokens.mjs"
```

- [ ] **Step 2: Add pass-through scripts to root package.json**

In the root `package.json`, add to `"scripts"`:

```json
"sync:style": "pnpm --filter=@perimeter-widgets/shared sync:style",
"sync:tokens": "pnpm --filter=@perimeter-widgets/shared sync:tokens"
```

- [ ] **Step 3: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
git add packages/shared/package.json package.json
git commit -m "chore: add sync:style and sync:tokens scripts"
```

---

## Chunk 2: Component Sync

### Task 5: Delete synced components and pull from registry

**Files:**

- Delete: 21 files in `packages/shared/src/components/ui/perimeter/` (synced components only)
- Recreate: Same 21 files via shadcn CLI from registry
- Modify: Import paths rewritten by post-sync script

**Important:** Do NOT delete the 6 portal components (`dialog.tsx`, `combobox.tsx`, `select.tsx`, `dropdown-menu.tsx`, `tooltip.tsx`, `multi-combobox.tsx`) or the 2 widget-specific compositions (`icon-select.tsx`, `sort-select.tsx`).

- [ ] **Step 1: Delete only the 21 synced component files**

Delete these 20 files from `packages/shared/src/components/ui/perimeter/`:

```
avatar.tsx, badge.tsx, button.tsx, calendar.tsx, card.tsx, checkbox.tsx,
command.tsx, empty.tsx, input.tsx, label.tsx, pagination.tsx, progress.tsx,
radio-group.tsx, scroll-area.tsx, separator.tsx, skeleton.tsx, spinner.tsx,
switch.tsx, tabs.tsx, textarea.tsx
```

Also delete `packages/shared/src/components/ui/input-group.tsx` — the registry version will be pulled into `ui/perimeter/input-group.tsx` by the CLI (since the `ui` alias maps to `@/components/ui` and registry files are at `registry/ui/perimeter/`).

After sync, update `packages/shared/src/components/index.ts` line 2:

```typescript
// Before
export * from './ui/input-group';
// After
export * from './ui/perimeter/input-group';
```

**Important:** The base UI wrapper files (`ui/button.tsx`, `ui/dialog.tsx`, `ui/input.tsx`, `ui/textarea.tsx`) must NOT be deleted. Some synced registry components import `@/components/ui/button` etc. (e.g., `command.tsx` imports `@/components/ui/dialog`). The post-sync script rewrites these to `../button`, `../dialog` etc., resolving to the base UI wrappers. These wrappers must remain API-compatible with what the registry components expect.

- [ ] **Step 2: Run the sync command**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets/packages/shared && pnpm sync:style`

This runs the shadcn CLI to pull all 21 components from the style registry, then runs `post-sync.mjs` to rewrite `@/` imports to relative paths.

Watch the output for:

- Which files were created/overwritten
- Any errors from the CLI (missing dependencies, auth issues)
- The post-sync import rewrite log

- [ ] **Step 3: Verify import paths were rewritten**

Check a few files to confirm `@/` imports are now relative:

Run: `grep -r '@/' packages/shared/src/components/ui/perimeter/*.tsx | head -10`
Expected: No results (all `@/` imports should be rewritten to relative).

If some `@/` imports remain, the post-sync script's `ALIAS_MAP` may need adjustment. Fix the map and re-run `node scripts/post-sync.mjs`.

- [ ] **Step 4: Check component exports still work**

Read `packages/shared/src/components/index.ts` — verify all `export * from './ui/perimeter/...'` lines still resolve to existing files. The synced files should be in the same locations as before.

If `input-group` moved, update the export in `index.ts` accordingly.

- [ ] **Step 5: Run typecheck**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm typecheck`
Expected: No type errors.

If there are import resolution failures, fix the post-sync script's alias map or manually adjust imports.

- [ ] **Step 6: Run tests**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm test`
Expected: All tests pass.

- [ ] **Step 7: Run full quality**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm quality`
Expected: Passes (excluding pre-existing Prettier warnings in untouched files).

- [ ] **Step 8: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
git add packages/shared/src/components/
git commit -m "refactor: replace hand-copied components with registry-synced versions"
```

---

### Task 6: Sync tokens from registry

**Files:**

- Modify: `packages/shared/src/styles/base.css` (token section replaced)

- [ ] **Step 1: Run the token sync**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets/packages/shared && pnpm sync:tokens`

Expected output:

```
Fetching theme from https://style.perimeter.org/r/default-theme.json...
  Light tokens: 39
  Dark tokens: 39
Token sync complete. Updated base.css.
```

- [ ] **Step 2: Verify base.css structure is intact**

Read `packages/shared/src/styles/base.css` and verify:

- Lines before `@sync:tokens-start` marker: Tailwind import, `@custom-variant dark`, `:host` reset, `.storybook-root`, box-sizing, button cursor, shimmer animation, scrollbar utility — all untouched
- Between markers: Fresh token values from style registry with `:root, :host` and `.dark, :host([data-theme="dark"])` selectors
- Lines after `@sync:tokens-end` marker: `@theme inline` block — untouched

- [ ] **Step 3: Run build to verify styles work**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm build`
Expected: Build succeeds. Tokens are picked up by Tailwind via the `@theme inline` block.

- [ ] **Step 4: Run full quality**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm quality`
Expected: Passes.

- [ ] **Step 5: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
git add packages/shared/src/styles/base.css
git commit -m "refactor: sync design tokens from style registry"
```

---

### Task 7: Final verification and docs update

**Files:**

- Modify: `docs/architecture/shared-package.md` (add sync workflow section)

- [ ] **Step 1: Run the storyboard**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm dev`

Manually verify in the browser that the sermons widget renders correctly — components display properly, styles are applied, dark mode works.

- [ ] **Step 2: Add sync documentation to shared-package.md**

Add a new section to `docs/architecture/shared-package.md` before the "Related Docs" section:

````markdown
---

## Style Registry Sync

Primitive UI components and design tokens are sourced from the style project's shadcn registry at `https://style.perimeter.org/r`. The shared package is a consumer — style is the single source of truth.

### Syncing Components

```bash
pnpm sync:style
```
````

Pulls 21 primitive components from the style registry into `src/components/ui/perimeter/` and rewrites `@/` imports to relative paths. The 6 portal-aware components (dialog, combobox, select, dropdown-menu, tooltip, multi-combobox) are widget-owned and not synced.

### Syncing Tokens

```bash
pnpm sync:tokens
```

Fetches the default theme from the registry and regenerates CSS custom properties in `src/styles/base.css` between `@sync:tokens-start` / `@sync:tokens-end` markers. Shadow DOM selectors (`:host`, `data-theme`) are preserved.

### When to Sync

Run both commands after the style project publishes updates:

1. Style project merges changes and deploys registry
2. Run `pnpm sync:style && pnpm sync:tokens` in perimeter-widgets
3. Verify: `pnpm quality` + visual check in storyboard
4. Commit the synced files

````

- [ ] **Step 3: Format and commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
pnpm prettier --write docs/architecture/shared-package.md
git add docs/architecture/shared-package.md
git commit -m "docs: add style registry sync workflow to shared-package.md"
````
