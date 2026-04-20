# Merge Style — Phase 1: Registry Package Subtree Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Subtree-merge the `style/` repo into `perimeter-widgets/`, split the staged files across their final homes (`packages/registry/` and `apps/site/`), and wire up both packages so `pnpm --filter @perimeter-widgets/site build` produces a working static export serving `/r/*.json` — all while preserving style's git history as ancestors of the new commits.

**Architecture:** Two new workspace entries. `packages/registry/` owns component source, themes, and the shadcn build that emits `public/r/*.json`. `apps/site/` is the Next.js 16 showcase that consumes the registry package via workspace imports, copies the registry's build output into its own `public/r/`, and deploys as static export. The existing `packages/storyboard/`, `packages/shared/`, `packages/widget-sermons/`, and `packages/vite-preset/` are not modified in this phase — they keep running side-by-side with the new site.

**Tech Stack:** Turborepo, pnpm workspaces, Next.js 16 (webpack, static export), shadcn CLI 4.x, Tailwind CSS v4, Node.js ESM scripts (tsx).

**Spec:** `docs/superpowers/specs/2026-04-20-merge-style-into-widgets-design.md`

**Branch:** `feat/registry-package-subtree` off `dev`.

**Out of scope in Phase 1:** retiring storyboard (Phase 4), deleting shared wrappers (Phase 2), renaming `widget-sermons` (Phase 3), adding `/design/*` pages (Phase 5), Vercel cutover (Phase 6). `style.perimeter.org` still serves from the old `style/` repo at the end of Phase 1.

---

## File Map

### Created (hand-written)

| File                                        | Responsibility                                                                                                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/registry/package.json`            | Declare `@perimeter-widgets/registry` workspace package with `exports` (including `./ui/perimeter/*` subpaths), `build` script chain          |
| `packages/registry/components.json`         | shadcn CLI config so `shadcn build` resolves aliases when emitting `public/r/*.json`                                                          |
| `packages/registry/tsconfig.json`           | Map `@/` aliases (`@/lib/*`, `@/hooks/*`, `@/components/ui/*`) to registry-local paths so on-disk shadcn source compiles inside the workspace |
| `packages/registry/src/index.ts`            | Barrel — re-export all 56 components + `cn` from `./lib/utils`                                                                                |
| `packages/registry/.gitignore`              | Ignore `public/r/`, `registry.json`, `node_modules/`, tsbuildinfo                                                                             |
| `apps/site/package.json`                    | Declare `@perimeter-widgets/site` Next.js app with build script chain and the registry workspace dep                                          |
| `apps/site/.gitignore`                      | Ignore `.next/`, `out/`, `public/r/`, generated demo files                                                                                    |
| `apps/site/scripts/copy-registry-output.ts` | Copy `packages/registry/public/r/*.json` → `apps/site/public/r/*.json`                                                                        |

### Moved from `style/` via subtree → `git mv`

Under `packages/registry/`:

- `registry/ui/perimeter/` (56 components + 56 demos + `lib/utils.ts`)
- `registry/themes/` (3 theme JSONs)
- `registry/base.json`
- `lib/utils.ts` (from `style/src/lib/utils.ts`)
- `hooks/use-copy-to-clipboard.ts`, `hooks/use-mobile.ts` (from `style/src/hooks/`)
- `scripts/generate-registry.ts` (all five path sites rewritten — see Task 6)
- `scripts/generate-theme-css.ts` (rewritten to emit two dialects into two files — see Task 7)

`registry.json` is NOT moved — it's gitignored in style so never lands in the subtree. It's regenerated from source by `generate-registry.ts` in Chunk 2.

Under `apps/site/`:

- `src/app/` (home, components, templates, tokens, docs, changelog, layout, globals.css)
- `src/components/site/` (15 files)
- `src/templates/` (5 files)
- `src/lib/` (everything **except** `utils.ts` which moved to registry)
- `public/` (favicon, svgs, robots.txt — not `public/r/` which is regenerated)
- `scripts/collect-demos.ts` (paths rewritten)
- `scripts/generate-sitemap.ts`
- `next.config.ts`, `next-env.d.ts`, `postcss.config.mjs`
- `eslint.config.mjs`
- `tsconfig.json` (rewritten for workspace layout)
- `components.json` (rewritten — `components` and `ui` aliases removed)
- `CHANGELOG.md`

### Dropped from staging (not ported)

- `.style-staging/src/components/ui/` (55 files — the site now imports from `@perimeter-widgets/registry` instead)
- `.style-staging/src/hooks/` (moved to registry, not site)
- `.style-staging/{package.json, pnpm-lock.yaml, pnpm-workspace.yaml, .gitignore, .prettierignore, README.md, ROADMAP.md, AGENTS.md, .claude/, .superpowers/, .turbo/, .worktrees/, .next/, node_modules/, out/, public/r/}` (monorepo already has these at root or regenerates them)

### Modified (perimeter-widgets existing files)

| File                      | Change                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm-workspace.yaml`     | Add `apps/*` and `widgets/*` globs (widgets/\* is a no-op until Phase 3)                                                                                           |
| `turbo.json`              | Extend `build.outputs` to include `apps/site/out/**`, `apps/site/public/r/**`, `packages/registry/public/r/**`, `packages/registry/registry.json` (Task 25 Step 1) |
| `package.json` (root)     | Add convenience scripts: `site:dev`, `site:build`, `registry:build`                                                                                                |
| `eslint.config.js` (root) | Add glob entries for `apps/site/**` and `packages/registry/**` if the current flat config doesn't already wildcard                                                 |
| `.prettierignore` (root)  | Add `apps/site/.next/`, `apps/site/out/`, `packages/registry/public/r/`                                                                                            |

### Import rewrites (site source, after relocation)

~51 total rewrites across ~18 files. All are scoped to ImportDeclaration strings — NOT to doc/sample strings inside page content:

- 19 `@/components/ui/<name>` imports → `@perimeter-widgets/registry`
    - src/app/components/[category]/[slug]/page.tsx (import only; doc sample strings preserved)
    - src/app/docs/getting-started/page.tsx (import only; doc sample strings preserved)
    - src/app/layout.tsx
    - src/app/templates/[slug]/page.tsx
    - src/app/templates/page.tsx
    - src/components/site/{code-block, component-playground, copy-install-button, mode-toggle, playground-controls, search-palette, search-trigger, theme-switcher}.tsx
- 3 `@/lib/utils` imports (outside the dropped `src/components/ui/`) → `@perimeter-widgets/registry` (re-exports `cn`)
    - src/components/site/{docs-sidebar, code-block, example-card}.tsx
- 29 `@registry/ui/perimeter/<name>` imports → `@perimeter-widgets/registry`
    - src/templates/{marketing-landing, dashboard, login, data-table, settings}.tsx

---

## Chunk 1: Branch, Subtree Import, and File Relocation

This chunk lands all of style's files in their final locations via a single subtree import plus `git mv` operations. After this chunk, the workspace has the right files in the right paths, but no package.json / tsconfig / import rewrites yet — nothing builds. History for every moved file reaches back to style.

### Task 1: Create feature branch from `docs/merge-style-design`

**Files:** none

The feature branch is based on `docs/merge-style-design` (not `dev`) so the committed spec and plan documents ride along in this PR's diff. If `docs/merge-style-design` is already merged to `dev`, use `origin/dev` instead.

- [ ] **Step 1: Confirm starting state**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
git status
git branch --show-current
```

Expected: clean tree. Current branch does not matter — the next step switches to the correct base.

- [ ] **Step 2: Create the feature branch**

```bash
git fetch origin
# If docs/merge-style-design has been merged to dev, use origin/dev:
# git checkout -b feat/registry-package-subtree origin/dev
git checkout -b feat/registry-package-subtree origin/docs/merge-style-design
```

Expected: `Switched to a new branch 'feat/registry-package-subtree'`.

- [ ] **Step 3: Verify spec and plan are in branch history**

```bash
git log --oneline -- docs/superpowers/specs/2026-04-20-merge-style-into-widgets-design.md
git log --oneline -- docs/superpowers/plans/2026-04-20-merge-style-phase-1-registry-subtree.md
```

Expected: both commands list at least one commit each. If either is empty, the branch base was wrong; reset and try again.

- [ ] **Step 4: Commit** (no-op — nothing staged yet; continue to Task 2)

---

### Task 2: Add style remote and subtree-import to staging prefix

**Files:**

- Create: `.style-staging/` (entire subtree; transient — removed by end of chunk)

- [ ] **Step 1: Add the style remote**

```bash
git remote add style-upstream https://github.com/perimeterchurch/style.git
git fetch style-upstream
```

Expected: fetch retrieves refs; `git remote -v` shows both `origin` (perimeter-widgets) and `style-upstream`.

- [ ] **Step 2: Run subtree-add against `.style-staging/`**

```bash
git subtree add --prefix=.style-staging style-upstream/dev
```

Expected: creates a merge commit "Add '.style-staging/' from commit '<sha>'" that brings style's entire tree into the monorepo under `.style-staging/`. All of style's history becomes reachable as ancestors.

- [ ] **Step 3: Verify history reachability**

```bash
git log --all -- .style-staging/registry/ui/perimeter/button.tsx | head -20
```

Expected: output shows style commits (e.g., "feat: compact selection display...", "fix: demo use client directives"), confirming the subtree brought ancestors — not just a single squash commit. If only one commit appears, stop and investigate; `git subtree add` without `--squash` was used for a reason.

- [ ] **Step 4: Commit** (already created by subtree-add; no manual commit needed)

---

### Task 2.5: Reformat the staged tree with monorepo Prettier

A subsequent prettier-reformat commit after the `git mv` operations would muddy git's rename heuristic and weaken `git log` traceability. Reformat in place NOW, as a single commit that applies to the staged paths only — the subsequent moves then see a clean similarity index.

**Files:**

- Modify: every `.ts`, `.tsx`, `.js`, `.mjs`, `.json`, `.md`, `.css` under `.style-staging/`

- [ ] **Step 1: Preview the diff size**

```bash
pnpm prettier --list-different '.style-staging/**/*.{ts,tsx,js,mjs,json,md,css}' 2>/dev/null | wc -l
```

Expected: several hundred files (style used 2-space indent + double quotes; monorepo uses 4-space + single quotes).

- [ ] **Step 2: Reformat**

```bash
pnpm prettier --write '.style-staging/**/*.{ts,tsx,js,mjs,json,md,css}'
```

Expected: prettier prints "unchanged" for some files and "reformatted" for most.

- [ ] **Step 3: Commit the reformat as a single atomic commit**

```bash
git add .style-staging
git commit -m "chore: prettier-reformat staged style tree before relocation

Prettier runs now (before git mv) so the subsequent file moves land
with clean similarity indices, preserving git log traceability."
```

---

### Task 3: Move registry sources into `packages/registry/`

**Files:**

- Move: `.style-staging/registry/*` → `packages/registry/`

Note: `.style-staging/registry.json` does not exist. Style's `.gitignore` lists `registry.json` so it never landed in the subtree. The manifest is regenerated by `generate-registry.ts` in Chunk 2 Task 16 from the sources being moved now.

- [ ] **Step 1: Create the registry package root and move files**

```bash
mkdir -p packages/registry
git mv .style-staging/registry/ui       packages/registry/ui
git mv .style-staging/registry/themes   packages/registry/themes
git mv .style-staging/registry/base.json packages/registry/base.json
```

Expected: files moved; `git status` shows renames (not copies) so history is preserved.

- [ ] **Step 1b: Confirm registry.json is absent (as expected)**

```bash
ls .style-staging/registry.json 2>/dev/null && echo "UNEXPECTED: registry.json present in subtree"
ls packages/registry/registry.json 2>/dev/null && echo "UNEXPECTED: registry.json already exists in new location"
```

Expected: both lines print nothing (no output). If either prints "UNEXPECTED", stop and investigate — style may have committed a previously-gitignored file.

- [ ] **Step 2: Verify component count**

```bash
ls packages/registry/ui/perimeter/*.tsx | grep -v '.demo.tsx' | wc -l
ls packages/registry/ui/perimeter/*.demo.tsx | wc -l
```

Expected: 56 and 56.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: relocate style registry sources into packages/registry/"
```

---

### Task 4: Move utils + hooks into `packages/registry/`

**Files:**

- Move: `.style-staging/src/lib/utils.ts` → `packages/registry/lib/utils.ts`
- Move: `.style-staging/src/hooks/*` → `packages/registry/hooks/`

- [ ] **Step 1: Move utils and hooks**

```bash
mkdir -p packages/registry/lib packages/registry/hooks
git mv .style-staging/src/lib/utils.ts packages/registry/lib/utils.ts
git mv .style-staging/src/hooks/use-copy-to-clipboard.ts packages/registry/hooks/use-copy-to-clipboard.ts
git mv .style-staging/src/hooks/use-mobile.ts packages/registry/hooks/use-mobile.ts
```

- [ ] **Step 2: Remove the empty `hooks/` directory from staging**

```bash
rmdir .style-staging/src/hooks 2>/dev/null || true
```

- [ ] **Step 3: Verify no duplicate utils**

```bash
ls packages/registry/ui/perimeter/lib/utils.ts 2>/dev/null && echo "NOTE: duplicate utils.ts exists under ui/perimeter/lib/ — inspect whether to dedupe"
```

Expected: the file likely still exists at `packages/registry/ui/perimeter/lib/utils.ts` (style has it there too). Leave it for now — it's part of the registry-internal import paths and is deduplicated at registry-build time via the manifest, not at filesystem level.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: relocate registry utils and hooks into packages/registry/"
```

---

### Task 6: Move and rewrite `generate-registry.ts`

**Files:**

- Move: `.style-staging/scripts/generate-registry.ts` → `packages/registry/scripts/generate-registry.ts`
- Modify: path constants + emitted path string templates inside the script

- [ ] **Step 1: Move the script**

```bash
mkdir -p packages/registry/scripts
git mv .style-staging/scripts/generate-registry.ts packages/registry/scripts/generate-registry.ts
```

- [ ] **Step 2: Update ALL path sites — five locations**

Open `packages/registry/scripts/generate-registry.ts`. There are five places where `src/` or `registry/` prefixes must be stripped (referenced line numbers are for style's current version):

| Line | Before                                                                            | After                                            |
| ---- | --------------------------------------------------------------------------------- | ------------------------------------------------ |
| ~15  | `const UI_DIR = join(ROOT, "registry/ui/perimeter");`                             | `const UI_DIR = join(ROOT, "ui/perimeter");`     |
| ~15  | `const THEMES_DIR = join(ROOT, "registry/themes");`                               | `const THEMES_DIR = join(ROOT, "themes");`       |
| ~17  | `const BASE_FILE = join(ROOT, "registry/base.json");`                             | `const BASE_FILE = join(ROOT, "base.json");`     |
| ~87  | `const hooksDir = join(ROOT, "src/hooks");`                                       | `const hooksDir = join(ROOT, "hooks");`          |
| ~81  | `{ path: "src/lib/utils.ts", type: "registry:lib" }` (emit in `utils` item block) | `{ path: "lib/utils.ts", type: "registry:lib" }` |
| ~95  | ``{ path: `src/hooks/${file}`, ... }``                                            | ``{ path: `hooks/${file}`, ... }``               |
| ~152 | ``{ path: `registry/ui/perimeter/${file}`, ... }``                                | ``{ path: `ui/perimeter/${file}`, ... }``        |
| ~176 | ``{ path: `registry/themes/${file}`, ... }``                                      | ``{ path: `themes/${file}`, ... }``              |

Additionally, the `OUTPUT` constant (`join(ROOT, "registry.json")`) stays — the script writes `registry.json` at the package root.

Verify exhaustively:

```bash
grep -nE '"src/|"registry/' packages/registry/scripts/generate-registry.ts
```

Expected: zero matches. If any remain, the rewrite missed a site; fix it.

- [ ] **Step 3: Smoke-test the script (runs against the newly-moved sources)**

```bash
cd packages/registry && node --experimental-strip-types scripts/generate-registry.ts 2>&1 | tail -5 ; cd ../..
```

(Using `node --experimental-strip-types` avoids needing tsx installed yet; Node 22+ supports it. If on older Node, skip this step and defer to Chunk 2 Task 16 where tsx is available after install.)

Expected: either success (a fresh `packages/registry/registry.json` emitted) or a dependency error. Any error along the lines of "Cannot find directory 'registry/ui/perimeter'" means the path constants are still wrong — fix before committing.

- [ ] **Step 4: Commit**

```bash
git add packages/registry/scripts/generate-registry.ts
# If the smoke test produced a fresh registry.json, DO NOT commit it — Task 16 covers
# regeneration, and the manifest is gitignored (see Task 16 Step 6).
git status packages/registry/registry.json  # confirm untracked or gitignored
git commit -m "chore(registry): move generate-registry.ts and rewrite all five path sites"
```

---

### Task 7: Move and rewrite `generate-theme-css.ts` to emit two dialects

**Files:**

- Move: `.style-staging/scripts/generate-theme-css.ts` → `packages/registry/scripts/generate-theme-css.ts`
- Rewrite: the full file body (keep theme-reading logic, replace target/write logic)

- [ ] **Step 1: Move the script**

```bash
git mv .style-staging/scripts/generate-theme-css.ts packages/registry/scripts/generate-theme-css.ts
```

- [ ] **Step 2: Replace the file contents with the registry-package version**

Overwrite `packages/registry/scripts/generate-theme-css.ts` with the following. This rewrite (a) reads themes from `./themes/*.json` relative to the registry package, (b) emits the rich site dialect (`:root`, `.light`, `.dark`, `:host`, `:host([data-mode="dark"])`, and per-slug `[data-theme="<slug>"]` overrides) into `apps/site/src/app/globals.css`, (c) emits the fused shadow-DOM-aware shared dialect into `packages/shared/src/styles/base.css`, (d) asserts the sorted token-key set is identical across both outputs, (e) exits non-zero if markers are missing or keys drift.

```typescript
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

async function readThemes(): Promise<ThemeFile[]> {
    const files = (await readdir(THEMES_DIR))
        .filter((f) => f.endsWith('.json'))
        .sort();
    return Promise.all(
        files.map(async (f) =>
            JSON.parse(await readFile(join(THEMES_DIR, f), 'utf-8')),
        ),
    );
}

function buildSiteBlock(themes: ThemeFile[]): string {
    const defaultTheme = themes.find((t) => t.name === 'default');
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
        if (theme.name === 'default') continue;
        const slug = theme.name;
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

function buildSharedBlock(themes: ThemeFile[]): string {
    const defaultTheme = themes.find((t) => t.name === 'default');
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

function assertTokenParity(themes: ThemeFile[]): void {
    const defaultTheme = themes.find((t) => t.name === 'default');
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
```

- [ ] **Step 3: Commit the rewritten script**

```bash
git add packages/registry/scripts/generate-theme-css.ts
git commit -m "feat(registry): rewrite generate-theme-css.ts to emit site + shared dialects"
```

The script does not run end-to-end until (a) `apps/site/src/app/globals.css` exists at its new path (Task 9), and (b) `packages/shared/src/styles/base.css` has `@sync:tokens-start`/`@sync:tokens-end` markers (confirmed present in that file today — Task 16 Step 4a verifies). End-to-end run happens in Chunk 2 Task 16.

---

### Task 8: Move site scripts into `apps/site/scripts/`

**Files:**

- Move: `.style-staging/scripts/collect-demos.ts` → `apps/site/scripts/collect-demos.ts`
- Move: `.style-staging/scripts/generate-sitemap.ts` → `apps/site/scripts/generate-sitemap.ts`

- [ ] **Step 1: Create site scripts directory and move**

```bash
mkdir -p apps/site/scripts
git mv .style-staging/scripts/collect-demos.ts apps/site/scripts/collect-demos.ts
git mv .style-staging/scripts/generate-sitemap.ts apps/site/scripts/generate-sitemap.ts
```

- [ ] **Step 2: Deferred — the real `collect-demos.ts` rewrite happens in Task 21**

Do NOT update `collect-demos.ts` content in this task. The full rewrite (new `registryDir` pointing at `packages/registry/ui/perimeter/`, new output dir under `apps/site/src/lib/`, new emitted `demoFile` / `demo-imports.ts` template literals pointing at the registry via a workspace subpath export) all land together in Chunk 3 Task 21, after the site package has a `package.json` and the monorepo knows about the registry's exported subpaths. Moving the file here without rewriting keeps Chunk 1 focused on relocation.

- [ ] **Step 3: Remove empty staging scripts dir**

```bash
rmdir .style-staging/scripts 2>/dev/null || true
```

- [ ] **Step 4: Commit**

```bash
git add apps/site/scripts/
git commit -m "chore(site): relocate collect-demos and generate-sitemap scripts (rewrites deferred to Task 21)"
```

---

### Task 9: Move site app sources into `apps/site/`

**Files:**

- Move: `.style-staging/src/app/` → `apps/site/src/app/`
- Move: `.style-staging/src/components/site/` → `apps/site/src/components/site/`
- Move: `.style-staging/src/templates/` → `apps/site/src/templates/`
- Move: `.style-staging/src/lib/*` (minus `utils.ts`, minus `demo-manifest.json`, minus `demo-imports.ts`) → `apps/site/src/lib/`
- Move: `.style-staging/public/*` (minus `r/`) → `apps/site/public/`
- Move: `.style-staging/next.config.ts`, `next-env.d.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `tsconfig.json`, `components.json`, `CHANGELOG.md` → `apps/site/`

- [ ] **Step 1: Create site source directories**

```bash
mkdir -p apps/site/src
```

- [ ] **Step 2: Move source trees — drop `src/components/ui/` directly from staging**

```bash
# Move the kept source trees
git mv .style-staging/src/app apps/site/src/app
mkdir -p apps/site/src/components
git mv .style-staging/src/components/site apps/site/src/components/site
git mv .style-staging/src/templates apps/site/src/templates
git mv .style-staging/src/lib apps/site/src/lib

# Drop the 55-file duplicate installed copy directly from staging — do NOT move it in first.
# This keeps rename detection clean for kept files and avoids a spurious move+delete in the PR.
git rm -r .style-staging/src/components/ui
```

Expected: `git status` shows the `src/components/site` rename, and 55 explicit deletions from `.style-staging/src/components/ui/`.

- [ ] **Step 3: Confirm demo-manifest.json and demo-imports.ts are absent**

These files are gitignored in style, so they were never in the subtree. Confirm:

```bash
ls apps/site/src/lib/demo-manifest.json apps/site/src/lib/demo-imports.ts 2>/dev/null
```

Expected: no output. If either exists, inspect — they shouldn't be committed in the tree.

- [ ] **Step 4: Move tracked public assets (scoped via `git ls-files` to avoid untracked generated files)**

```bash
mkdir -p apps/site/public
# Iterate tracked files only — git ls-files omits gitignored outputs like public/r/ and public/sitemap.xml.
git ls-files .style-staging/public | while read -r f; do
  rel=${f#.style-staging/public/}
  mkdir -p "apps/site/public/$(dirname "$rel")"
  git mv "$f" "apps/site/public/$rel"
done
```

- [ ] **Step 5: Move config files**

```bash
git mv .style-staging/next.config.ts apps/site/next.config.ts
git mv .style-staging/next-env.d.ts apps/site/next-env.d.ts
git mv .style-staging/postcss.config.mjs apps/site/postcss.config.mjs
git mv .style-staging/eslint.config.mjs apps/site/eslint.config.mjs
git mv .style-staging/tsconfig.json apps/site/tsconfig.json
git mv .style-staging/components.json apps/site/components.json
git mv .style-staging/CHANGELOG.md apps/site/CHANGELOG.md
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(site): relocate style app sources into apps/site/"
```

---

### Task 10: Drop the remaining staging files and remove `.style-staging/`

**Files:**

- Delete: everything remaining under `.style-staging/`

- [ ] **Step 1: List what's left**

```bash
find .style-staging -type f | head -30
```

Expected: remaining files are things we don't port — `package.json`, `pnpm-lock.yaml`, `README.md`, `ROADMAP.md`, `AGENTS.md`, `.gitignore`, `.prettierignore`, `.claude/*`, `.superpowers/*`, `.turbo/*`, `tsconfig.tsbuildinfo`, possibly `out/*` (build output).

- [ ] **Step 2: Merge `.prettierignore` patterns into root `.prettierignore`**

Read `.style-staging/.prettierignore` for any project-specific ignore patterns; append any that are still relevant to the monorepo root `.prettierignore`. Skip patterns that reference paths specific to style's old layout (e.g., `src/lib/demo-imports.ts` if present — this now lives at `apps/site/src/lib/demo-imports.ts`, which the monorepo root prettierignore should reference).

- [ ] **Step 3: Delete the rest**

```bash
git rm -rf .style-staging
```

Expected: `git status` shows `.style-staging/` is fully removed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: drop .style-staging tree (files relocated; remainder not ported)"
```

---

### Task 11: Verify Chunk 1 end-state

**Files:** none

- [ ] **Step 1: Inspect the tree**

```bash
ls packages/registry/
ls apps/site/
ls apps/site/src/
find .style-staging 2>/dev/null | head
```

Expected:

- `packages/registry/` contains: `ui/`, `themes/`, `lib/`, `hooks/`, `scripts/`, `base.json`, `registry.json`.
- `apps/site/` contains: `src/`, `scripts/`, `public/`, `next.config.ts`, `next-env.d.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `tsconfig.json`, `components.json`, `CHANGELOG.md`.
- `apps/site/src/` contains: `app/`, `components/site/`, `templates/`, `lib/` (no `components/ui/`).
- `.style-staging` does not exist.

- [ ] **Step 2: Verify history reachability**

```bash
git log --all --oneline -- packages/registry/ui/perimeter/button.tsx | head -5
git log --all --oneline -- apps/site/src/components/site/top-nav.tsx | head -5
```

Expected: each command lists multiple commits, including ones authored in the style repo (not just the chunk-1 move commits). If only chunk-1 commits appear, rename detection failed; stop and investigate.

- [ ] **Step 3: Ensure nothing else builds yet (expected)**

```bash
pnpm -w install
```

Expected: install completes without hard errors, but may print warnings about `packages/registry/` and `apps/site/` lacking `package.json` files (they're added in Chunk 2 and 3). If install fails hard, investigate before proceeding.

**Chunk 1 end-state:** all files are in their final locations with preserved history; no package.json exists in `packages/registry/` or `apps/site/`; the monorepo still builds only `packages/shared/`, `packages/storyboard/`, `packages/vite-preset/`, `packages/widget-sermons/` as before.

---

## Chunk 2: Registry Package Wire-up

This chunk makes `packages/registry/` a real workspace package that builds. At the end, `pnpm --filter @perimeter-widgets/registry build` regenerates `registry.json`, runs `shadcn build` → `public/r/*.json`, and runs `generate-theme-css.ts` → updates site globals + shared base.css. It does NOT yet make the site build, which depends on Chunk 3.

### Task 12: Add `packages/registry/package.json`

**Files:**

- Create: `packages/registry/package.json`

- [ ] **Step 1: Write the package manifest**

Create `packages/registry/package.json`:

```json
{
    "name": "@perimeter-widgets/registry",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "main": "src/index.ts",
    "types": "src/index.ts",
    "exports": {
        ".": "./src/index.ts",
        "./themes/*": "./themes/*"
    },
    "scripts": {
        "build": "tsx scripts/generate-registry.ts && shadcn build && tsx scripts/generate-theme-css.ts",
        "build:manifest": "tsx scripts/generate-registry.ts",
        "build:shadcn": "shadcn build",
        "build:themes": "tsx scripts/generate-theme-css.ts",
        "typecheck": "tsc --noEmit"
    },
    "dependencies": {
        "@base-ui/react": "^1.3.0",
        "class-variance-authority": "^0.7.1",
        "clsx": "^2.1.1",
        "cmdk": "^1.1.1",
        "date-fns": "^4.1.0",
        "downshift": "^9.3.2",
        "embla-carousel-react": "^8.6.0",
        "input-otp": "^1.4.2",
        "lucide-react": "^1.7.0",
        "react": "^19",
        "react-day-picker": "^9.14.0",
        "react-dom": "^19",
        "react-resizable-panels": "^4.7.6",
        "recharts": "3.8.0",
        "sonner": "^2.0.7",
        "tailwind-merge": "^3.5.0",
        "tw-animate-css": "^1.4.0",
        "vaul": "^1.1.2"
    },
    "devDependencies": {
        "@types/node": "^20.19.37",
        "@types/react": "^19.2.14",
        "@types/react-dom": "^19.2.3",
        "shadcn": "^4.1.1",
        "tsx": "^4.21.0",
        "typescript": "^5.9.3"
    }
}
```

Rationale: dependency list matches style's `package.json` minus Next.js-only packages (those go to `apps/site`). React peer range relaxed to `^19` for workspace consumption.

- [ ] **Step 2: Commit**

```bash
git add packages/registry/package.json
git commit -m "feat(registry): add @perimeter-widgets/registry package manifest"
```

---

### Task 12.5: Add `packages/registry/components.json`

`shadcn build` needs a `components.json` in the cwd so the CLI can resolve the `aliases` map used to rewrite `@/` imports inside emitted JSON. Style keeps one alongside its `registry.json`; the registry package needs its own. Aliases trim to those the registry items actually reference.

**Files:**

- Create: `packages/registry/components.json`

- [ ] **Step 1: Write the config**

```json
{
    "$schema": "https://ui.shadcn.com/schema.json",
    "style": "base-nova",
    "rsc": true,
    "tsx": true,
    "tailwind": {
        "config": "",
        "css": "",
        "baseColor": "neutral",
        "cssVariables": true,
        "prefix": ""
    },
    "iconLibrary": "lucide",
    "aliases": {
        "components": "@/components",
        "utils": "@/lib/utils",
        "ui": "@/components/ui",
        "lib": "@/lib",
        "hooks": "@/hooks"
    },
    "registries": {}
}
```

Unlike the site's `components.json` (which removes `components` and `ui` aliases to disable `shadcn add`), the registry's file keeps them because the shadcn CLI embeds these aliases into the consumer-facing JSON output — external projects installing from `/r/button.json` see `@/components/ui/button` and remap it via their own `components.json`. Don't omit them here.

- [ ] **Step 2: Commit**

```bash
git add packages/registry/components.json
git commit -m "feat(registry): add components.json for shadcn build"
```

---

### Task 13: Add `packages/registry/tsconfig.json`

**Files:**

- Create: `packages/registry/tsconfig.json`

- [ ] **Step 1: Write the tsconfig**

Create `packages/registry/tsconfig.json`:

```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@/lib/*": ["./lib/*", "./ui/perimeter/lib/*"],
            "@/hooks/*": ["./hooks/*"],
            "@/components/ui/*": ["./ui/perimeter/*"]
        },
        "jsx": "react-jsx",
        "moduleResolution": "bundler",
        "noEmit": true
    },
    "include": [
        "src/**/*",
        "ui/**/*",
        "lib/**/*",
        "hooks/**/*",
        "themes/**/*.json",
        "scripts/**/*"
    ],
    "exclude": ["node_modules", "public/r"]
}
```

The `@/lib/*` path includes two fallbacks so both `@/lib/utils` (from the root utils at `lib/utils.ts`) and `@/lib/utils` inside `ui/perimeter/lib/utils.ts` (the registry-item-local copy) resolve.

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @perimeter-widgets/registry typecheck
```

Expected: reports errors for missing deps (@base-ui/react etc. not yet installed because `pnpm install` hasn't run since package.json was added). That's fine — we'll install in Task 15. The goal here is to confirm the tsconfig parses.

If it parses (no "tsconfig.json not found"/"Cannot find name" at the config level), proceed.

- [ ] **Step 3: Commit**

```bash
git add packages/registry/tsconfig.json
git commit -m "feat(registry): add tsconfig with @/ path aliases"
```

---

### Task 14: Write `packages/registry/src/index.ts` barrel

**Files:**

- Create: `packages/registry/src/index.ts`

- [ ] **Step 1: Enumerate component names**

```bash
ls packages/registry/ui/perimeter/*.tsx | grep -v '.demo.tsx' | xargs -n1 basename | sed 's/.tsx$//' | sort
```

Expected: 56 names (accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, button-group, calendar, card, carousel, chart, checkbox, collapsible, combobox, command, context-menu, dialog, direction, drawer, dropdown-menu, empty, field, hover-card, input, input-group, input-otp, item, kbd, label, menubar, multi-combobox, native-select, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, spinner, switch, table, tabs, textarea, toggle, toggle-group, tooltip).

- [ ] **Step 2: Write the barrel**

Create `packages/registry/src/index.ts`:

```typescript
// Component re-exports
export * from '../ui/perimeter/accordion';
export * from '../ui/perimeter/alert';
export * from '../ui/perimeter/alert-dialog';
export * from '../ui/perimeter/aspect-ratio';
export * from '../ui/perimeter/avatar';
export * from '../ui/perimeter/badge';
export * from '../ui/perimeter/breadcrumb';
export * from '../ui/perimeter/button';
export * from '../ui/perimeter/button-group';
export * from '../ui/perimeter/calendar';
export * from '../ui/perimeter/card';
export * from '../ui/perimeter/carousel';
export * from '../ui/perimeter/chart';
export * from '../ui/perimeter/checkbox';
export * from '../ui/perimeter/collapsible';
export * from '../ui/perimeter/combobox';
export * from '../ui/perimeter/command';
export * from '../ui/perimeter/context-menu';
export * from '../ui/perimeter/dialog';
export * from '../ui/perimeter/direction';
export * from '../ui/perimeter/drawer';
export * from '../ui/perimeter/dropdown-menu';
export * from '../ui/perimeter/empty';
export * from '../ui/perimeter/field';
export * from '../ui/perimeter/hover-card';
export * from '../ui/perimeter/input';
export * from '../ui/perimeter/input-group';
export * from '../ui/perimeter/input-otp';
export * from '../ui/perimeter/item';
export * from '../ui/perimeter/kbd';
export * from '../ui/perimeter/label';
export * from '../ui/perimeter/menubar';
export * from '../ui/perimeter/multi-combobox';
export * from '../ui/perimeter/native-select';
export * from '../ui/perimeter/navigation-menu';
export * from '../ui/perimeter/pagination';
export * from '../ui/perimeter/popover';
export * from '../ui/perimeter/progress';
export * from '../ui/perimeter/radio-group';
export * from '../ui/perimeter/resizable';
export * from '../ui/perimeter/scroll-area';
export * from '../ui/perimeter/select';
export * from '../ui/perimeter/separator';
export * from '../ui/perimeter/sheet';
export * from '../ui/perimeter/sidebar';
export * from '../ui/perimeter/skeleton';
export * from '../ui/perimeter/slider';
export * from '../ui/perimeter/sonner';
export * from '../ui/perimeter/spinner';
export * from '../ui/perimeter/switch';
export * from '../ui/perimeter/table';
export * from '../ui/perimeter/tabs';
export * from '../ui/perimeter/textarea';
export * from '../ui/perimeter/toggle';
export * from '../ui/perimeter/toggle-group';
export * from '../ui/perimeter/tooltip';

// Utility
export { cn } from '../lib/utils';
```

Note: a component file that doesn't export a default-exportable set of symbols (e.g., `sonner` re-exports from the `sonner` package; `direction` is a provider) will still compile via `export *` — anything that's exported gets re-exported. If a file has zero exports, TypeScript will warn; inspect the offending file if a warning fires.

- [ ] **Step 3: Verify no duplicate-export errors**

Export-star collisions happen when two re-exported modules both export a symbol with the same name. Run:

```bash
pnpm --filter @perimeter-widgets/registry typecheck 2>&1 | grep -i "duplicate\|ambiguous\|2308\|2397"
```

Expected: no output. If any appear, wrap the offending module with a named re-export (`export { X as XFromSlider } from "..."`) rather than a bare `export *`.

- [ ] **Step 4: Commit**

```bash
git add packages/registry/src/index.ts
git commit -m "feat(registry): add workspace barrel re-exporting all 56 components + cn"
```

---

### Task 15: Root workspace wiring — install deps and verify resolve

**Files:**

- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Add globs to workspace config**

Open `pnpm-workspace.yaml` at the monorepo root. Add `apps/*` and `widgets/*` to the existing globs:

```yaml
packages:
    - 'packages/*'
    - 'apps/*'
    - 'widgets/*'
```

- [ ] **Step 2: Install**

```bash
pnpm -w install
```

Expected: installs dependencies declared in `packages/registry/package.json`; `@perimeter-widgets/registry` appears in `pnpm ls --depth 0` at the root.

- [ ] **Step 3: Verify the registry resolves as a workspace package**

```bash
pnpm ls --recursive | grep -A1 "@perimeter-widgets/registry"
```

Expected: the registry package is listed with `0.1.0` version and no missing dep warnings.

- [ ] **Step 4: Commit**

```bash
git add pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore(workspace): add apps/* and widgets/* globs; install registry deps"
```

---

### Task 16: Run registry build end-to-end

**Files:** none (verification only)

- [ ] **Step 1: Regenerate the manifest**

```bash
pnpm --filter @perimeter-widgets/registry run build:manifest
```

Expected: `registry.json` regenerated with current paths; exit 0.

- [ ] **Step 2: Run shadcn build**

```bash
pnpm --filter @perimeter-widgets/registry run build:shadcn
```

Expected: 60+ items written to `packages/registry/public/r/` (one JSON per component + utils + hooks + base + themes). Count:

```bash
ls packages/registry/public/r/*.json | wc -l
```

Expected: at least 60 (56 components + `utils` + 2 hooks + `perimeter-base` + 3 themes).

- [ ] **Step 3: Spot-check one output**

```bash
cat packages/registry/public/r/button.json | python3 -c "import json, sys; d = json.load(sys.stdin); print('name:', d.get('name')); print('files:', [f.get('path') for f in d.get('files', [])])"
```

Expected: name is `button`, files reference paths like `components/ui/button.tsx` (shadcn CLI rewrites `@/` aliases into the registered shadcn alias map at build time — so consumer install paths differ from on-disk paths, and that's correct).

- [ ] **Step 4a: Verify marker preconditions**

Before running the theme script, confirm both destination files have the markers the script expects:

```bash
grep -c "@generated-themes-start\|@generated-themes-end" apps/site/src/app/globals.css
grep -c "@sync:tokens-start\|@sync:tokens-end" packages/shared/src/styles/base.css
```

Expected: both print `2` (one start marker, one end marker per file). If `apps/site/src/app/globals.css` is missing markers, the Chunk 1 move corrupted them — investigate. If `packages/shared/src/styles/base.css` is missing markers, the `sync:tokens` predecessor never wrote them; add them manually around an empty line like so before proceeding:

```css
/* @sync:tokens-start */
/* @sync:tokens-end */
```

- [ ] **Step 4b: Run build:themes**

```bash
pnpm --filter @perimeter-widgets/registry run build:themes
```

Expected: exit 0; prints "Injected N theme(s) into: ..." and lists both file paths. The script also runs `pnpm prettier --write` on both files.

- [ ] **Step 5: Commit the build artifacts**

Do NOT commit `packages/registry/public/r/` — that's build output, and the registry package's `.gitignore` (add it next task) will exclude it. Commit only the verified-working shape:

```bash
# Confirm no accidental staging
git status
```

Expected: clean — no tracked changes. If `packages/registry/public/r/` shows up, add a `.gitignore`.

- [ ] **Step 6: Add `packages/registry/.gitignore`**

```
public/r/
registry.json
node_modules/
tsconfig.tsbuildinfo
```

`registry.json` is gitignored because it's regenerated on every `build:manifest` run from the source files — same approach style used. The built `public/r/*.json` is similarly regenerated each build.

Commit:

```bash
git add packages/registry/.gitignore
git commit -m "chore(registry): ignore build outputs (public/r/, registry.json)"
```

**Chunk 2 end-state:** `pnpm --filter @perimeter-widgets/registry build` runs end-to-end, emitting registry JSON for consumers + updating theme CSS in the site and shared. The site itself is not yet buildable — Chunk 3 handles that.

---

## Chunk 3: Site App Wire-up

This chunk turns `apps/site/` into a functional Next.js 16 app that consumes the registry workspace package. At the end, `pnpm --filter @perimeter-widgets/site build` produces a working static export at `apps/site/out/` containing `/r/*.json` and all showcase pages.

### Task 17: Write `apps/site/package.json`

**Files:**

- Create: `apps/site/package.json`

- [ ] **Step 1: Write the manifest**

Create `apps/site/package.json`:

```json
{
    "name": "@perimeter-widgets/site",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "scripts": {
        "dev": "pnpm --filter @perimeter-widgets/registry run build:themes && pnpm collect:demos && next dev --webpack",
        "build": "pnpm --filter @perimeter-widgets/registry run build && pnpm copy:registry && pnpm collect:demos && pnpm generate:sitemap && next build",
        "start": "next start",
        "lint": "eslint .",
        "typecheck": "tsc --noEmit",
        "collect:demos": "tsx scripts/collect-demos.ts",
        "copy:registry": "tsx scripts/copy-registry-output.ts",
        "generate:sitemap": "tsx scripts/generate-sitemap.ts",
        "format:check": "prettier --check ."
    },
    "dependencies": {
        "@base-ui/react": "^1.3.0",
        "@perimeter-widgets/registry": "workspace:*",
        "class-variance-authority": "^0.7.1",
        "clsx": "^2.1.1",
        "cmdk": "^1.1.1",
        "date-fns": "^4.1.0",
        "downshift": "^9.3.2",
        "embla-carousel-react": "^8.6.0",
        "input-otp": "^1.4.2",
        "lucide-react": "^1.7.0",
        "next": "16.2.1",
        "next-themes": "^0.4.6",
        "react": "19.2.4",
        "react-day-picker": "^9.14.0",
        "react-dom": "19.2.4",
        "react-resizable-panels": "^4.7.6",
        "recharts": "3.8.0",
        "sonner": "^2.0.7",
        "tailwind-merge": "^3.5.0",
        "tw-animate-css": "^1.4.0",
        "vaul": "^1.1.2"
    },
    "devDependencies": {
        "@tailwindcss/postcss": "^4.2.2",
        "@types/node": "^20.19.37",
        "@types/react": "^19.2.14",
        "@types/react-dom": "^19.2.3",
        "eslint": "^9.39.4",
        "eslint-config-next": "16.2.1",
        "shiki": "^4.0.2",
        "tailwindcss": "^4.2.2",
        "tsx": "^4.21.0",
        "typescript": "^5.9.3"
    }
}
```

The dependency on `@perimeter-widgets/registry: workspace:*` wires up the cross-package import.

- [ ] **Step 2: Commit**

```bash
git add apps/site/package.json
git commit -m "feat(site): add @perimeter-widgets/site Next.js app manifest"
```

---

### Task 17.5: Add `transpilePackages` to `apps/site/next.config.ts`

The registry package ships raw TypeScript (`main: "src/index.ts"`). Next.js won't transpile workspace-symlinked `.ts` sources unless the package is explicitly listed in `transpilePackages`. Without this, `next build` fails with "Failed to parse source" on any import of `@perimeter-widgets/registry`.

**Files:**

- Modify: `apps/site/next.config.ts`

- [ ] **Step 1: Read current contents**

```bash
cat apps/site/next.config.ts
```

Expected (from style):

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'export',
    turbopack: {
        root: import.meta.dirname,
    },
};

export default nextConfig;
```

- [ ] **Step 2: Add transpilePackages**

Replace the file with:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'export',
    transpilePackages: ['@perimeter-widgets/registry'],
    turbopack: {
        root: import.meta.dirname,
    },
};

export default nextConfig;
```

- [ ] **Step 3: Commit**

```bash
git add apps/site/next.config.ts
git commit -m "feat(site): transpile @perimeter-widgets/registry (ships raw TS)"
```

---

### Task 18: Update `apps/site/tsconfig.json`

**Files:**

- Modify: `apps/site/tsconfig.json`

- [ ] **Step 1: Read the current file**

```bash
cat apps/site/tsconfig.json
```

The style version likely has `paths: { "@/*": ["./src/*"], "@registry/*": ["./registry/*"] }` and `extends: "./tsconfig..."` or similar.

- [ ] **Step 2: Rewrite for the new layout**

Replace the contents of `apps/site/tsconfig.json` with:

```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@/*": ["./src/*"]
        },
        "jsx": "preserve",
        "module": "esnext",
        "moduleResolution": "bundler",
        "target": "ES2022",
        "lib": ["dom", "dom.iterable", "esnext"],
        "resolveJsonModule": true,
        "allowJs": true,
        "esModuleInterop": true,
        "isolatedModules": true,
        "skipLibCheck": true,
        "noEmit": true,
        "incremental": true,
        "plugins": [{ "name": "next" }]
    },
    "include": [
        "src/**/*",
        "scripts/**/*",
        "next-env.d.ts",
        ".next/types/**/*.ts"
    ],
    "exclude": ["node_modules", "out", ".next"]
}
```

The `@registry/*` alias from style's tsconfig is intentionally dropped — the site now imports from `@perimeter-widgets/registry` (the workspace package name), not from a path alias.

- [ ] **Step 3: Commit**

```bash
git add apps/site/tsconfig.json
git commit -m "feat(site): rewrite tsconfig for workspace layout (drop @registry/, keep @/)"
```

---

### Task 19: Strip `components`/`ui` aliases from `apps/site/components.json`

**Files:**

- Modify: `apps/site/components.json`

- [ ] **Step 1: Read current contents**

```bash
cat apps/site/components.json
```

Expected (inherited from style):

```json
{
    "$schema": "https://ui.shadcn.com/schema.json",
    "style": "base-nova",
    "rsc": true,
    "tsx": true,
    "tailwind": {
        "config": "",
        "css": "src/app/globals.css",
        "baseColor": "neutral",
        "cssVariables": true,
        "prefix": ""
    },
    "iconLibrary": "lucide",
    "rtl": false,
    "aliases": {
        "components": "@/components",
        "utils": "@/lib/utils",
        "ui": "@/components/ui",
        "lib": "@/lib",
        "hooks": "@/hooks"
    },
    "menuColor": "default",
    "menuAccent": "subtle",
    "registries": {}
}
```

- [ ] **Step 2: Remove the `components` and `ui` aliases**

Edit `apps/site/components.json` so the `aliases` object is:

```json
"aliases": {
  "utils": "@/lib/utils",
  "lib": "@/lib",
  "hooks": "@/hooks"
}
```

Removing `components` and `ui` makes `pnpm dlx shadcn@latest add` inside `apps/site/` fail loudly with a missing-alias error instead of silently materializing a duplicate UI tree. `shadcn build` does not run in the site; it runs in `packages/registry/`, which has its own separate `registry.json` (no `components.json` needed there since we're building a registry, not consuming one).

- [ ] **Step 3: Commit**

```bash
git add apps/site/components.json
git commit -m "feat(site): remove components/ui aliases from components.json

The site imports registry components via @perimeter-widgets/registry,
not via a local src/components/ui/ directory. Removing these aliases
makes shadcn add fail loudly rather than silently re-materialize the
duplicate tree we just dropped."
```

---

### Task 19.5: Extend Tailwind `@source` scan scope to registry components

Tailwind v4 scans the project directory it sits in for utility classes. After Chunk 1 dropped `src/components/ui/`, the registry components at `packages/registry/ui/perimeter/*.tsx` are outside the site's default scan — their utility classes will not be emitted in the generated CSS, and registry components will render unstyled.

**Files:**

- Modify: `apps/site/src/app/globals.css`

- [ ] **Step 1: Add the `@source` directive**

Near the top of `apps/site/src/app/globals.css`, after `@import "tailwindcss";` (line 1), add:

```css
/* Scan the registry package so Tailwind emits utility classes used by registry components. */
@source "../../../../packages/registry/ui/perimeter/**/*.{ts,tsx}";
```

The relative path resolves from `apps/site/src/app/globals.css` up to the monorepo root (`../../../../`) and into `packages/registry/ui/perimeter/`.

- [ ] **Step 2: Verify a registry-only class is emitted**

Pick a utility used only inside a registry component (not in any site file). For example, `data-[state=open]:bg-muted` appears in several Base UI wrappers. After the next `next build`, grep the compiled output:

```bash
pnpm --filter @perimeter-widgets/site build
grep -l "data-\[state=open\]:bg-muted" apps/site/out/_next/static/css/*.css
```

Expected: at least one match. If zero, the `@source` directive isn't being picked up — check the relative path.

(This verification runs after Task 23's full build; defer the actual run until then.)

- [ ] **Step 3: Commit**

```bash
git add apps/site/src/app/globals.css
git commit -m "feat(site): add @source directive for Tailwind to scan registry components"
```

---

### Task 20: Rewrite site imports from `@/components/ui/*` and `@registry/*` → `@perimeter-widgets/registry`

**Files:**

- Modify: ~18 files total — 19 `@/components/ui/<name>` imports (site chrome + app pages), 3 `@/lib/utils` imports (site chrome), and 29 `@registry/ui/perimeter/<name>` imports (templates).

- [ ] **Step 1: List files needing rewrite**

```bash
cd apps/site
rg -l 'from ["'"'"']@/components/ui/' src/
rg -l 'from ["'"'"']@/lib/utils' src/
rg -l 'from ["'"'"']@registry/ui/perimeter/' src/
cd ../..
```

Expected first list: ~13 files. Second: ~3 files. Third: 5 files (all in `src/templates/`).

- [ ] **Step 2: Run the codemod — import-statement-scoped regex**

Do NOT match `@/components/ui/` anywhere in a file; match only inside `from "..."` or `from '...'` import-specifier strings. This avoids corrupting documentation string literals in pages like `src/app/docs/getting-started/page.tsx` and `src/app/components/[category]/[slug]/page.tsx` which include `import { X } from "@/components/ui/..."` as displayed sample code.

From monorepo root, on macOS (BSD sed):

```bash
# @/components/ui/<name> → @perimeter-widgets/registry
find apps/site/src -type f \( -name '*.tsx' -o -name '*.ts' \) -print0 \
  | xargs -0 sed -E -i '' "s|(from[[:space:]]*['\"])@/components/ui/[a-z0-9-]+(['\"])|\1@perimeter-widgets/registry\2|g"

# @/lib/utils → @perimeter-widgets/registry (re-exports cn)
find apps/site/src -type f \( -name '*.tsx' -o -name '*.ts' \) -print0 \
  | xargs -0 sed -E -i '' "s|(from[[:space:]]*['\"])@/lib/utils(['\"])|\1@perimeter-widgets/registry\2|g"

# @registry/ui/perimeter/<name> → @perimeter-widgets/registry (templates only, but scope is the same)
find apps/site/src -type f \( -name '*.tsx' -o -name '*.ts' \) -print0 \
  | xargs -0 sed -E -i '' "s|(from[[:space:]]*['\"])@registry/ui/perimeter/[a-z0-9-]+(['\"])|\1@perimeter-widgets/registry\2|g"
```

On Linux (GNU sed), use `sed -E -i` (no empty-string argument after `-i`):

```bash
find apps/site/src -type f \( -name '*.tsx' -o -name '*.ts' \) -print0 \
  | xargs -0 sed -E -i "s|(from[[:space:]]*['\"])@/components/ui/[a-z0-9-]+(['\"])|\1@perimeter-widgets/registry\2|g"
# (repeat for the other two rules)
```

- [ ] **Step 3: Consolidate duplicate import lines**

After the sed pass, a file may have multiple lines importing from `@perimeter-widgets/registry`. That's legal TypeScript but ugly; consolidate manually or via a second pass. For each file listed in Step 1:

```bash
# Example for one file — repeat or scripting-loop
grep -n "@perimeter-widgets/registry" apps/site/src/app/layout.tsx
```

If there are multiple imports from `@perimeter-widgets/registry`, merge them into a single `import { X, Y, Z } from "@perimeter-widgets/registry";` statement at the top of the file. This is for readability, not correctness.

- [ ] **Step 4: Verify no `@/components/ui/`, `@/lib/utils`, or `@registry/*` imports remain**

```bash
rg 'from ["'"'"']@/components/ui/' apps/site/src/
rg 'from ["'"'"']@/lib/utils' apps/site/src/
rg 'from ["'"'"']@registry/' apps/site/src/
```

Expected: all three return zero matches. If any remain (especially in string literals inside docs/pages — those are DOCS showing consumers how to install, and should NOT be rewritten), manually verify they are legitimate string-literal usages before declaring done. Only imports, not docs, should have been rewritten.

- [ ] **Step 5: Typecheck**

```bash
pnpm --filter @perimeter-widgets/site typecheck
```

Expected: errors fall into these buckets:

1. Missing type exports from `@perimeter-widgets/registry` — fix by adding a named export in `packages/registry/src/index.ts`.
2. Type-only imports that need `import type` — fix in place.
3. Next.js 16 RSC boundary errors (if components flagged `"use client"` got imported at compile time into a server page that didn't exist in style's set). Fix by matching the boundary.

If the typecheck fails with hundreds of errors, stop and inspect the first 10 — they likely share a root cause.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(site): rewrite @/components/ui and @/lib/utils imports to workspace registry"
```

---

### Task 21: Rewrite `collect-demos.ts` for the new layout

**Files:**

- Modify: `apps/site/scripts/collect-demos.ts`
- Modify: `packages/registry/package.json` (add `./ui/perimeter/*` subpath export)

Style's script reads from `./registry/ui/perimeter/` relative to `process.cwd()` and emits `demoFile: "@registry/ui/perimeter/${slug}.demo"` strings into both the manifest and the generated `demo-imports.ts`. The `@registry/*` path alias is gone. The `demoFile` field is only referenced from `src/lib/demo-types.ts` as a typed string — there are no consumers reading it as a URL today (`grep demoFile apps/site/src` returns only the type declaration). The real binding is `demoImports` in `demo-imports.ts`, which the playground page imports.

Approach: keep `demoFile` populated for documentation, but switch its value to the workspace subpath `@perimeter-widgets/registry/ui/perimeter/${slug}.demo` so anyone reading it sees the same import specifier that `demoImports` uses. Add a matching `./ui/perimeter/*` subpath export to the registry's `package.json`.

- [ ] **Step 1: Add the subpath export to `packages/registry/package.json`**

Edit the `exports` field:

```json
"exports": {
    ".": "./src/index.ts",
    "./themes/*": "./themes/*",
    "./ui/perimeter/*.demo": "./ui/perimeter/*.demo.tsx",
    "./ui/perimeter/*": "./ui/perimeter/*.tsx"
}
```

Note: the more-specific `*.demo` pattern appears **before** the broader `*` pattern so Node's subpath-pattern resolver matches demo imports against the correct `.demo.tsx` file. Reversing the order technically works today (pattern specificity generally wins), but explicit ordering documents intent and is robust across Node versions.

- [ ] **Step 2: Rewrite the file contents of `apps/site/scripts/collect-demos.ts`**

Replace with:

```typescript
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface ManifestEntry {
    slug: string;
    name: string;
    description: string;
    category: string;
    install: string;
    demoFile: string;
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(SCRIPT_DIR, '..');
const REGISTRY_DIR = resolve(SITE_ROOT, '../../packages/registry');
const DEMO_DIR = join(REGISTRY_DIR, 'ui/perimeter');
const OUTPUT_DIR = join(SITE_ROOT, 'src/lib');
const MANIFEST = join(OUTPUT_DIR, 'demo-manifest.json');
const IMPORTS = join(OUTPUT_DIR, 'demo-imports.ts');

async function collect(): Promise<void> {
    const files = await readdir(DEMO_DIR);
    const demoFiles = files.filter((f) => f.endsWith('.demo.tsx')).sort();

    const manifest: ManifestEntry[] = [];
    for (const file of demoFiles) {
        const content = await readFile(join(DEMO_DIR, file), 'utf-8');
        const slug = file.replace('.demo.tsx', '');

        const nameMatch = content.match(/name:\s*"([^"]+)"/);
        const descMatch = content.match(/description:\s*"([^"]+)"/);
        const catMatch = content.match(/category:\s*"([^"]+)"/);
        const installMatch = content.match(/install:\s*"([^"]+)"/);
        if (!nameMatch || !descMatch || !catMatch || !installMatch) {
            console.warn(`Skipping ${file}: missing meta fields`);
            continue;
        }

        manifest.push({
            slug,
            name: nameMatch[1]!,
            description: descMatch[1]!,
            category: catMatch[1]!,
            install: installMatch[1]!,
            demoFile: `@perimeter-widgets/registry/ui/perimeter/${slug}.demo`,
        });
    }

    manifest.sort(
        (a, b) =>
            a.category.localeCompare(b.category)
            || a.name.localeCompare(b.name),
    );

    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Collected ${manifest.length} demo(s) → ${MANIFEST}`);

    const header = `// Auto-generated by apps/site/scripts/collect-demos.ts — do not edit manually\n\n`;
    const typeImport = `import type { ControlsConfig, DemoExample, DemoMeta } from "@/lib/demo-types";\n\n`;
    const moduleInterface = [
        'export interface DemoModule {',
        '    meta: DemoMeta;',
        '    controls: ControlsConfig;',
        '    Playground: React.ComponentType<Record<string, unknown>>;',
        '    examples: DemoExample[];',
        '}',
        '',
    ].join('\n');
    const lines = manifest.map(
        (entry) =>
            `    "${entry.slug}": () => import("@perimeter-widgets/registry/ui/perimeter/${entry.slug}.demo") as unknown as Promise<DemoModule>,`,
    );
    const body = [
        '// Each demo exports a Playground typed to its specific controls config.',
        '// We widen via assertion so all demos share the DemoModule interface.',
        'export const demoImports: Record<string, () => Promise<DemoModule>> = {',
        ...lines,
        '};',
        '',
    ].join('\n');

    await writeFile(
        IMPORTS,
        header + typeImport + moduleInterface + '\n' + body,
    );
    console.log(`Wrote ${manifest.length} imports → ${IMPORTS}`);
}

collect().catch((err) => {
    console.error('collect-demos failed:', err);
    process.exit(1);
});
```

- [ ] **Step 3: Commit the script + package.json edit, then run collect**

```bash
git add apps/site/scripts/collect-demos.ts packages/registry/package.json
git commit -m "feat(site): rewrite collect-demos for workspace layout and subpath import"

pnpm --filter @perimeter-widgets/site run collect:demos
```

Expected: "Collected 56 demos → .../demo-manifest.json", "Wrote 56 imports → .../demo-imports.ts".

- [ ] **Step 4: Verify demo count**

```bash
python3 -c "import json; d = json.load(open('apps/site/src/lib/demo-manifest.json')); print(len(d), 'demos')"
```

Expected: 56. If lower, a `.demo.tsx` file is missing `meta` fields — inspect stderr output from Step 3. These outputs are gitignored (Task 22 Step 4), so no commit needed.

---

### Task 22: Add `copy-registry-output.ts`

**Files:**

- Create: `apps/site/scripts/copy-registry-output.ts`

- [ ] **Step 1: Write the script**

Create `apps/site/scripts/copy-registry-output.ts`:

```typescript
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
```

- [ ] **Step 2: Run it**

```bash
pnpm --filter @perimeter-widgets/site run copy:registry
```

Expected: prints "Copied N registry JSON files...", where N ≥ 60. Requires that Task 16 (registry build) ran first in this branch; if `packages/registry/public/r/` doesn't exist, run registry build first.

- [ ] **Step 3: Verify site has /r/ files**

```bash
ls apps/site/public/r/*.json | wc -l
```

Expected: ≥60.

- [ ] **Step 4: Add `apps/site/.gitignore`**

Create or update `apps/site/.gitignore`:

```
.next/
out/
node_modules/
public/r/
src/lib/demo-manifest.json
src/lib/demo-imports.ts
tsconfig.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/site/scripts/copy-registry-output.ts apps/site/.gitignore
git commit -m "feat(site): add copy-registry-output script and gitignore build artifacts"
```

---

### Task 23: Full site build

**Files:** none (verification only)

- [ ] **Step 1: Install (in case any site deps weren't fetched)**

```bash
pnpm -w install
```

- [ ] **Step 2: Run the full site build**

```bash
pnpm --filter @perimeter-widgets/site build
```

Expected steps:

1. Registry build: regenerate registry.json, run shadcn build, run generate-theme-css.
2. Site copy: copy-registry-output.ts writes to `apps/site/public/r/`.
3. Collect demos: manifest refreshed.
4. Sitemap: `out/sitemap.xml`.
5. Next build: `apps/site/out/` contains the static export.

If step 5 fails with type errors or RSC boundary violations, inspect the first error — most will trace back to an import that the codemod rewrote but that needs an additional change (e.g., a type that used to live under `@/components/ui/<name>` is now named differently in the registry barrel).

- [ ] **Step 3: Verify the static export**

```bash
ls apps/site/out/r/*.json | wc -l
ls apps/site/out/components/
ls apps/site/out/index.html apps/site/out/templates/
```

Expected: 60+ JSON files at `out/r/`, populated `out/components/`, and the HTML pages for the showcase routes.

- [ ] **Step 4: Smoke-test registry JSON output**

```bash
python3 -c "
import json, sys
with open('apps/site/out/r/button.json') as f:
    d = json.load(f)
print('name:', d.get('name'))
print('files:', [f.get('path') for f in d.get('files', [])])
print('deps:', d.get('dependencies'))
"
```

Expected: name=button, a files array with standard shadcn install paths (`registry/default/ui/button.tsx` or similar after shadcn CLI's internal rewrite), dependencies list non-empty.

- [ ] **Step 5: Run site dev (manual check — the agent won't verify this but the human should)**

```bash
pnpm --filter @perimeter-widgets/site dev
```

Then in a browser: open `http://localhost:3000/`, click through `/components/actions/button`, `/templates/dashboard`, `/tokens`, `/docs`. Theme switcher should work. `/r/button.json` should serve the registry JSON. Kill with `Ctrl-C` when satisfied.

- [ ] **Step 6: Commit** (no output to commit — all generated files are gitignored)

```bash
git status
```

Expected: clean. If any `public/r/`, `out/`, `.next/`, or `demo-*` files appear in status, add them to `.gitignore` and continue.

---

## Chunk 4: Final Verification, Root Wiring, and PR

### Task 24: Update root `package.json` with convenience scripts

**Files:**

- Modify: `package.json` (monorepo root)

- [ ] **Step 1: Add scripts**

In the root `package.json`, add:

```json
"site:dev": "pnpm --filter @perimeter-widgets/site dev",
"site:build": "pnpm --filter @perimeter-widgets/site build",
"site:typecheck": "pnpm --filter @perimeter-widgets/site typecheck",
"registry:build": "pnpm --filter @perimeter-widgets/registry build"
```

Do NOT change root `pnpm dev` — it still points at storyboard during Phases 1–3. That flip happens in Phase 4.

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore(root): add site and registry convenience scripts"
```

---

### Task 25: Verify all existing packages still build

**Files:** none (verification only)

- [ ] **Step 1: Inspect and update `turbo.json` if needed**

Verify `turbo.json` at the monorepo root has `build.outputs` covering new destinations:

```bash
cat turbo.json
```

Current `outputs` entry is `["dist/**"]`. The site emits to `apps/site/out/**` and the registry emits to `packages/registry/public/r/**`. Turbo only caches outputs it knows about, so these need to be added:

```json
"build": {
    "dependsOn": ["^build"],
    "outputs": ["dist/**", "apps/site/out/**", "apps/site/public/r/**", "packages/registry/public/r/**", "packages/registry/registry.json"]
}
```

(Turbo filters outputs per-package automatically, so enumerating all new paths once here is fine.)

- [ ] **Step 2: Run full workspace build**

```bash
pnpm -w build
```

Expected: all packages build — registry, site, shared, storyboard, vite-preset, widget-sermons. The prettier-reformat was already applied in Task 2.5 before any `git mv`, so no format-drift commits are needed here. `pnpm -w quality` should pass without any reformat cleanup.

If any of the pre-existing packages fail, Phase 1 broke something it shouldn't have. Most common failure: shared's `sync:tokens` script runs and tries to `fetch('https://style.perimeter.org/r/default-theme.json')` — but `sync:tokens` is only triggered manually, not in `build`, so this shouldn't fire here. If it does, investigate.

- [ ] **Step 3: Run full workspace quality**

```bash
pnpm -w quality
```

Expected: typecheck + lint + test + format:check all pass.

- [ ] **Step 4: Re-verify history**

```bash
git log --all --oneline -- apps/site/src/components/site/top-nav.tsx | wc -l
git log --all --oneline -- packages/registry/ui/perimeter/button.tsx | wc -l
```

Expected: both counts clearly greater than 1 (commits from style + the chunk-1 move commit). A count of exactly 1 means rename detection lost the ancestry — Task 2.5's pre-move reformat should have prevented this, but if it happens, try `git log --find-renames=40% --all --oneline -- <path>` to lower the threshold.

---

### Task 26: Smoke-test external consumer flow

**Files:** none (verification only — confirms Phase 6's eventual cutover has a valid target)

- [ ] **Step 1: Confirm `/r/button.json` shape matches the old deployment**

From a working `pnpm --filter @perimeter-widgets/site build` output, compare a handful of outputs against the currently-deployed style site:

```bash
curl -s https://style.perimeter.org/r/button.json | python3 -m json.tool > /tmp/old-button.json
cat apps/site/out/r/button.json | python3 -m json.tool > /tmp/new-button.json
diff /tmp/old-button.json /tmp/new-button.json
```

Expected: a small diff (maybe a regenerated dependencies ordering). A large diff — missing files, changed paths — signals that `generate-registry.ts` or the registry.json path-rewrite got something wrong. Stop and fix.

Repeat for `dialog.json`, `card.json`, `utils.json`, `perimeter-base.json`, and one theme (`default-theme.json`).

- [ ] **Step 2: Test a scratch install (optional but high-value)**

Skip this step if tedious — Phase 6 runs the equivalent test against the real Vercel deployment before DNS cutover.

```bash
mkdir /tmp/shadcn-scratch && cd /tmp/shadcn-scratch
pnpm init -y

# Serve apps/site/out as static files in the background
(cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets/apps/site/out && python3 -m http.server 8765) &
SERVER_PID=$!
sleep 1

pnpm dlx shadcn@latest init -d -y

# Write the scratch components.json with a @perimeter registry namespace pointing at localhost
cat > components.json <<'EOF'
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-nova",
  "tsx": true,
  "tailwind": { "config": "", "css": "src/app/globals.css", "baseColor": "neutral", "cssVariables": true },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "registries": {
    "@perimeter": "http://localhost:8765/r/{name}.json"
  }
}
EOF

pnpm dlx shadcn@latest add @perimeter/button

# Alternatively, skip the registries config and install by direct URL:
#   pnpm dlx shadcn@latest add http://localhost:8765/r/button.json

kill $SERVER_PID
```

Expected: button.tsx + deps install under `src/components/ui/`, imports rewritten via shadcn aliases. If the install succeeds, the new build is shape-compatible with real consumers. If it fails, diff against the live `style.perimeter.org/r/button.json` and iterate on `generate-registry.ts`.

---

### Task 27: Push and open PR

**Files:** none (git operation)

- [ ] **Step 1: Ensure quality passes one more time**

```bash
pnpm -w quality
```

- [ ] **Step 2: Push the branch**

```bash
git push -u origin feat/registry-package-subtree
```

- [ ] **Step 3: Write the PR body to a temp file**

Use the Write tool to create `/tmp/phase-1-pr-body.md` with content like:

```markdown
## Summary

Phase 1 of the `style/` → `perimeter-widgets/` merge. Subtree-imports style's
full git history into the monorepo, splits the tree across its final homes,
and wires up two new workspace entries:

- `packages/registry/` — component source, themes, shadcn build → `public/r/*.json`
- `apps/site/` — Next.js 16 showcase consuming the registry via workspace import

After this PR:

- `pnpm --filter @perimeter-widgets/site build` produces a static export
  serving `/r/*.json` at `apps/site/out/r/`.
- `pnpm --filter @perimeter-widgets/registry build` runs shadcn build +
  regenerates theme CSS in both the site and the shared package.
- Storyboard, shared, widget-sermons, vite-preset are untouched and still build.
- `style.perimeter.org` continues to deploy from the standalone `style/` repo
  until Phase 6.

Spec: `docs/superpowers/specs/2026-04-20-merge-style-into-widgets-design.md`
Plan: `docs/superpowers/plans/2026-04-20-merge-style-phase-1-registry-subtree.md`

## Test plan

- [ ] `pnpm -w install` succeeds
- [ ] `pnpm -w build` succeeds (registry, site, shared, storyboard, vite-preset, widget-sermons)
- [ ] `pnpm -w quality` passes (typecheck + lint + test + format:check)
- [ ] `apps/site/out/r/button.json` diff vs live `style.perimeter.org/r/button.json` is empty or trivially-reordered
- [ ] Manual: `pnpm --filter @perimeter-widgets/site dev`, click through /components, /templates, /tokens, /docs; theme switcher works
- [ ] `git log --all -- packages/registry/ui/perimeter/button.tsx` shows style history
```

- [ ] **Step 4: Open the PR**

```bash
gh pr create --base dev --title "feat: Phase 1 - subtree-merge style into registry and site" --body-file /tmp/phase-1-pr-body.md
```

(Title is 57 chars, under the 70-char guidance in the parent CLAUDE.md. Use a hyphen rather than an em dash to stay ASCII.)

Expected: PR URL printed — return it to the user.

- [ ] **Step 5: Confirm the plan + spec are in the PR diff**

Because Task 1 based this branch on `docs/merge-style-design`, both documents are already in history — no cherry-pick needed. Confirm:

```bash
git log --oneline origin/dev..HEAD -- docs/superpowers/specs/2026-04-20-merge-style-into-widgets-design.md
git log --oneline origin/dev..HEAD -- docs/superpowers/plans/2026-04-20-merge-style-phase-1-registry-subtree.md
```

Expected: both commands list at least one commit. If either is empty, the feat branch was accidentally created from `origin/dev` instead of `origin/docs/merge-style-design` (Task 1 Step 2); cherry-pick using a portable command:

```bash
# Portable alternative to BSD `tail -r` — use `--reverse` on git log itself
git log --reverse --pretty=format:'%H' origin/docs/merge-style-design ^origin/dev \
  -- docs/superpowers/specs/2026-04-20-merge-style-into-widgets-design.md \
     docs/superpowers/plans/2026-04-20-merge-style-phase-1-registry-subtree.md \
  | xargs -I {} git cherry-pick {}
git push
```

---

## Post-Phase 1

After the Phase 1 PR merges to `dev`:

1. The standalone `style/` repo continues to deploy `style.perimeter.org` unchanged.
2. `apps/site` is a functional second deployment target (not yet DNS-cutover).
3. `packages/storyboard` still runs; `root pnpm dev` still starts storyboard.
4. Phase 2 (`refactor/shared-imports-from-registry`) is the next plan to write — it removes the wrapper duplicates in `packages/shared/` and the `sync:style` / `sync:tokens` scripts, switching shared to import from the workspace registry.

Each subsequent phase gets its own plan file in `docs/superpowers/plans/`, written when the previous phase has merged and the team is ready to execute the next one.
