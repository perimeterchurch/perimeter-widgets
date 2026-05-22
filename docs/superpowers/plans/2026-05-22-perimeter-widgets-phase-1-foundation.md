# Perimeter Widgets — Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the new perimeter-widgets monorepo so a Studio app renders a built-in example widget in both native and as-shipped modes, with every supporting package present, `pnpm quality` green, and CI enforced.

**Architecture:** Turborepo monorepo. Packages: `theme`, `ui`, `auth`, `api-client`, `widget-runtime`, `vite-plugin-widget`. One example widget (`widgets/example`). One Next.js app (`apps/studio`). React 19 with Tailwind v4 + shadow-DOM style isolation. IIFE widget builds via Vite library mode driven by an in-repo Vite plugin that converts a `defineWidget` default export into the actual bundle entry.

**Tech Stack:** pnpm 10.x, Node 22+, Turborepo 2.x, TypeScript 5.x (strict), Vite 6.x library mode, React 19, Tailwind v3 (JS preset model — chosen for v3's mature widget-bundling story; v4 migration is a later, isolated change), zod, TanStack Query 5.x, Radix primitives, Vitest 2.x + jsdom, ESLint 9 flat config, Prettier 3.x, Next.js 16 App Router.

**Source spec:** `docs/superpowers/specs/2026-05-22-perimeter-widgets-phase-1-foundation-design.md`
**Umbrella:** `docs/superpowers/specs/2026-05-22-perimeter-widgets-rebuild-design.md`

**Worktree note:** This rebuild starts greenfield. Before Chunk 1, the existing `perimeter-widgets` tree is archived to a `legacy/v1` branch and the working tree is cleared of code (specs/plans stay). See Chunk 1 Task 1 for the exact archival steps.

---

## File Structure Overview

Final layout after Phase 1:

```
perimeter-widgets/
├── .github/workflows/ci.yml                       # CI: install + quality + build, no deploy
├── .gitignore
├── .npmrc
├── .prettierrc
├── .prettierignore
├── eslint.config.js                               # flat config, TS + react + react-hooks
├── package.json                                   # workspace root scripts + dev deps
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json                             # strict TS config, extended by every package
├── turbo.json                                     # pipelines: dev, build, test, lint, typecheck
├── apps/
│   └── studio/
│       ├── package.json
│       ├── next.config.ts                         # rewrite /widget-bundles/* → dist/*
│       ├── tailwind.config.ts                     # uses @perimeter/theme preset
│       ├── postcss.config.js
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx                       # landing → links to /components, /widgets, /theme
│       │   │   ├── components/
│       │   │   │   ├── page.tsx                   # index of components
│       │   │   │   └── [slug]/page.tsx            # per-component preview + prop controls
│       │   │   ├── widgets/
│       │   │   │   ├── page.tsx                   # index of widgets
│       │   │   │   └── [slug]/page.tsx            # widget preview with mode toggle
│       │   │   ├── theme/page.tsx                 # token editor
│       │   │   └── admin/page.tsx                 # stubbed "Phase 3" placeholder
│       │   ├── lib/
│       │   │   ├── components-registry.ts         # static list of component pages
│       │   │   ├── widgets-registry.ts            # static list of widget packages
│       │   │   ├── theme-overrides-context.tsx    # React context for live token edits
│       │   │   └── widget-preview/
│       │   │       ├── widget-preview.tsx         # mode toggle + dispatcher
│       │   │       ├── native-renderer.tsx        # calls nativeRender from runtime
│       │   │       └── as-shipped-renderer.tsx    # loads IIFE bundle + applyOverrides shim
│       │   └── styles/globals.css                 # Tailwind base + token CSS variables
│       └── tests/
│           └── widget-preview.test.tsx
├── packages/
│   ├── theme/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                           # public exports
│   │   │   ├── tokens.ts                          # source-of-truth token map
│   │   │   ├── resolver.ts                        # resolveTokens() implementation
│   │   │   ├── tailwind.ts                        # tailwindPreset
│   │   │   └── tailwind-entry.ts                  # default export at @perimeter/theme/tailwind subpath
│   │   ├── tests/
│   │   │   ├── resolver.test.ts
│   │   │   └── tokens.test.ts
│   │   └── vitest.config.ts
│   ├── ui/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── utils/cn.ts                        # tiny class-merge helper, internal
│   │   ├── tests/
│   │   │   ├── button.test.tsx
│   │   │   ├── card.test.tsx
│   │   │   ├── input.test.tsx
│   │   │   ├── label.test.tsx
│   │   │   └── skeleton.test.tsx
│   │   └── vitest.config.ts
│   ├── auth/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── types.ts                           # AuthProvider interface
│   │   │   └── mp-local-storage-auth.ts
│   │   ├── tests/
│   │   │   ├── mp-local-storage-auth.test.ts
│   │   └── vitest.config.ts
│   ├── api-client/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── create-api-client.ts
│   │   ├── tests/
│   │   │   └── create-api-client.test.ts
│   │   └── vitest.config.ts
│   ├── widget-runtime/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                           # public exports
│   │   │   ├── define-widget.ts
│   │   │   ├── mount.tsx                          # mountWidget + native-render code paths
│   │   │   ├── native-render.ts                   # nativeRender thin wrapper around mount internals
│   │   │   ├── auto-mount.ts                      # scans DOM + MutationObserver
│   │   │   ├── registry.ts                        # CSS map + live instance registry
│   │   │   ├── global.ts                          # ensureGlobal: window.PerimeterWidgets
│   │   │   ├── data-attrs.ts                      # parse data-* into config + theme overrides
│   │   │   ├── providers/
│   │   │   │   ├── theme-provider.tsx
│   │   │   │   ├── auth-provider.tsx
│   │   │   │   ├── auth-gate.tsx
│   │   │   │   ├── query-provider.tsx
│   │   │   │   └── error-boundary.tsx
│   │   │   └── hooks/
│   │   │       ├── use-auth.ts
│   │   │       └── use-api-client.ts
│   │   ├── tests/
│   │   │   ├── data-attrs.test.ts
│   │   │   ├── registry.test.ts
│   │   │   ├── mount.test.tsx
│   │   │   ├── auto-mount.test.tsx
│   │   │   ├── auth-gate.test.tsx
│   │   │   └── error-boundary.test.tsx
│   │   └── vitest.config.ts
│   └── vite-plugin-widget/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts                           # public exports
│       │   ├── plugin.ts                          # perimeterWidget() implementation
│       │   └── virtual-entry.ts                   # virtual module source builder
│       ├── tests/
│       │   └── plugin.test.ts
│       └── vitest.config.ts
└── widgets/
    └── example/
        ├── package.json
        ├── tsconfig.json
        ├── vite.config.ts
        ├── vitest.config.ts
        ├── src/
        │   ├── index.ts                           # default export: defineWidget(...)
        │   └── app.tsx
        └── tests/
            ├── app.test.tsx
            └── bundle.test.ts                     # post-build size check
```

Boundaries chosen so each file has one purpose. The runtime is split into many small files; that's intentional given how much is going on (providers, lifecycle, registry, global API).

---

## Plan Chunks

1. **Chunk 1** — Greenfield reset, repo scaffold, root tooling baseline. `pnpm quality` green on an empty workspace.
2. **Chunk 2** — `@perimeter/theme` package (tokens, resolver, Tailwind preset) with tests.
3. **Chunk 3** — `@perimeter/ui` package (5 components) with tests.
4. **Chunk 4** — `@perimeter/auth` + `@perimeter/api-client` with tests.
5. **Chunk 5** — `@perimeter/widget-runtime`: registry, data-attrs, providers, mount, native-render, auto-mount, global.
6. **Chunk 6** — `@perimeter/vite-plugin-widget`.
7. **Chunk 7** — `widgets/example`: builds to IIFE, size budget enforced.
8. **Chunk 8** — `apps/studio`: shell, components routes, theme editor, widget preview with mode toggle, theme-propagation to as-shipped, late-mount + DOM-equality tests.
9. **Chunk 9** — CI workflow, final acceptance verification.

Each chunk ends with a single git commit (or two when natural — code + tests, then a follow-up wire-up commit). The plan calls these out explicitly.

---

## Chunk 1: Greenfield reset, repo scaffold, tooling baseline

**Outcome:** A monorepo with no source code, only the tooling skeleton. `pnpm install && pnpm quality` exits 0. CI placeholder runs the same. Branch model and conventions preserved.

### Task 1.1: Archive existing repo state, clear the working tree

**Files:**
- Modify: working tree (delete everything except `docs/`, `.git/`, `.github/`, `.gitignore`, `.worktrees/`, `.superpowers/`)
- Create: `legacy/v1` branch pointer

- [ ] **Step 1.1.1:** Confirm you are on the working branch (`docs/widgets-rebuild-design` or a worktree off `dev`). Confirm the working tree is clean:

  Run: `git status`
  Expected: `nothing to commit, working tree clean`. The plan file itself (`docs/superpowers/plans/2026-05-22-perimeter-widgets-phase-1-foundation.md`) is expected to be present and already committed before execution begins — if it shows as untracked, commit it now on this branch before proceeding.

- [ ] **Step 1.1.2:** Create the `legacy/v1` branch pointing at the current `dev` tip (so the old code remains accessible):

  Run: `git branch legacy/v1 origin/dev`
  Expected: no output (branch created).

  Then push so others can see it:

  Run: `git push origin legacy/v1`
  Expected: `* [new branch] legacy/v1 -> legacy/v1`.

- [ ] **Step 1.1.3:** From the current working branch, delete every top-level entry except the ones to preserve. `CLAUDE.md` is intentionally included in the deletion — it describes the old architecture and will be replaced with a stub for the new one in Step 1.1.4. Note that `pnpm-lock.yaml` is deleted now because dependency versions change in this rebuild; the lockfile is regenerated by `pnpm install` in Step 1.2.10.

  Run:
  ```bash
  git rm -rf apps packages widgets dist scripts \
              CLAUDE.md env.d.ts eslint.config.js package.json pnpm-lock.yaml \
              pnpm-workspace.yaml tsconfig.base.json turbo.json .env.example \
              .npmrc .prettierignore .prettierrc
  rm -rf node_modules .turbo dist
  ```
  Expected: files staged for deletion. `git status` shows deletions and the preserved `docs/` (with the two specs), `.gitignore`, `.github/`, `.superpowers/`, `.worktrees/`, and `.claude/` (skill directory, not in git rm list — implicitly preserved).

- [ ] **Step 1.1.4:** Write a stub `CLAUDE.md` for the new architecture. This is intentionally minimal during the rebuild and will be filled out as the platform matures.

  ```markdown
  # CLAUDE.md

  Guidance for Claude Code working in this repository.

  ## Status

  Rebuild in progress. The platform is being rebuilt from scratch per the
  specs at `docs/superpowers/specs/2026-05-22-perimeter-widgets-rebuild-design.md`
  (umbrella) and `docs/superpowers/specs/2026-05-22-perimeter-widgets-phase-1-foundation-design.md`
  (current phase).

  Implementation plan: `docs/superpowers/plans/2026-05-22-perimeter-widgets-phase-1-foundation.md`.

  ## Commands

  | Command | Description |
  | --- | --- |
  | `pnpm install` | Install dependencies |
  | `pnpm dev` | Run dev tasks across the workspace (Studio + widget watches) |
  | `pnpm build` | Build every package via Turborepo |
  | `pnpm test` | Run all tests |
  | `pnpm lint` | Lint all packages |
  | `pnpm typecheck` | Type-check all packages |
  | `pnpm quality` | typecheck + lint + test + prettier check (gate before PR) |

  ## Critical rules

  - Always use `pnpm`; never npm or npx.
  - Never commit directly to `dev` or `main`. Use a feature branch and a PR.
  - Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, `ci:`.
  - Read the active phase spec before modifying the platform.

  ## Prior state

  Pre-rebuild code is archived at the `legacy/v1` branch.
  ```

  Save as `CLAUDE.md` at the repo root.

- [ ] **Step 1.1.5:** Stage the new CLAUDE.md and commit the reset together:

  Run:
  ```bash
  git add CLAUDE.md
  git commit -m "chore: clear repo for greenfield rebuild

  Archived prior state at the legacy/v1 branch. Working tree retains
  docs (including the rebuild specs), .github workflows, .gitignore,
  and editor config. CLAUDE.md is replaced with a stub describing the
  rebuild status.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```
  Expected: one commit recorded, working tree clean.

### Task 1.2: Author root tooling files

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `eslint.config.js`
- Create: `.prettierrc`
- Create: `.prettierignore`
- Create: `.npmrc`
- Modify: `.gitignore`

- [ ] **Step 1.2.1:** Write `package.json`:

  ```json
  {
    "name": "perimeter-widgets",
    "private": true,
    "type": "module",
    "packageManager": "pnpm@10.32.1",
    "engines": { "node": ">=22" },
    "scripts": {
      "dev": "turbo dev",
      "build": "turbo build",
      "test": "turbo test",
      "lint": "turbo lint",
      "typecheck": "turbo typecheck",
      "format": "prettier --write .",
      "format:check": "prettier --check .",
      "quality": "turbo typecheck lint test && pnpm format:check"
    },
    "devDependencies": {
      "@eslint/js": "^9.18.0",
      "@types/node": "^22.10.5",
      "eslint": "^9.18.0",
      "eslint-config-prettier": "^10.0.1",
      "eslint-plugin-react": "^7.37.4",
      "eslint-plugin-react-hooks": "^5.1.0",
      "prettier": "^3.4.2",
      "turbo": "^2.3.3",
      "typescript": "^5.7.3",
      "typescript-eslint": "^8.20.0"
    }
  }
  ```

- [ ] **Step 1.2.2:** Write `pnpm-workspace.yaml`:

  ```yaml
  packages:
    - "apps/*"
    - "packages/*"
    - "widgets/*"
  ```

- [ ] **Step 1.2.3:** Write `turbo.json`. Note: `test` and `typecheck` depend on `^typecheck` rather than `^build` so pure-TS packages don't need an actual `build` step to be tested or type-checked. Only `build` itself walks the dependency tree's build outputs.

  ```json
  {
    "$schema": "https://turbo.build/schema.json",
    "tasks": {
      "build": {
        "dependsOn": ["^build"],
        "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
      },
      "dev": {
        "cache": false,
        "persistent": true,
        "dependsOn": ["^build"]
      },
      "test": {
        "dependsOn": ["^typecheck"],
        "outputs": ["coverage/**"]
      },
      "lint": {},
      "typecheck": {
        "dependsOn": ["^typecheck"]
      }
    }
  }
  ```

- [ ] **Step 1.2.4:** Write `tsconfig.base.json`:

  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "Bundler",
      "lib": ["ES2022", "DOM", "DOM.Iterable"],
      "jsx": "react-jsx",
      "strict": true,
      "noUncheckedIndexedAccess": true,
      "exactOptionalPropertyTypes": true,
      "noImplicitOverride": true,
      "noFallthroughCasesInSwitch": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "isolatedModules": true,
      "verbatimModuleSyntax": true,
      "declaration": true,
      "declarationMap": true,
      "sourceMap": true,
      "incremental": true
    }
  }
  ```

- [ ] **Step 1.2.5:** Write `eslint.config.js`. Uses typescript-eslint's `projectService` so each package's `tsconfig.json` is picked up automatically — every package's `tsconfig.json` MUST extend `tsconfig.base.json` and include its own `src/**/*` for typed lint rules to resolve. This is enforced naturally by every subsequent chunk creating per-package tsconfigs.

  ```js
  // eslint.config.js — flat config
  import js from '@eslint/js';
  import tseslint from 'typescript-eslint';
  import react from 'eslint-plugin-react';
  import reactHooks from 'eslint-plugin-react-hooks';
  import prettier from 'eslint-config-prettier';

  export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      },
      plugins: { react, 'react-hooks': reactHooks },
      rules: {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/consistent-type-imports': 'error',
      },
      settings: { react: { version: 'detect' } },
    },
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/tests/**/*'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-implied-eval': 'off',
        'no-implied-eval': 'off',
      },
    },
    {
      ignores: [
        '**/dist/**',
        '**/.next/**',
        '**/.turbo/**',
        '**/node_modules/**',
        '**/coverage/**',
      ],
    },
    prettier,
  );
  ```

- [ ] **Step 1.2.6:** Write `.prettierrc`:

  ```json
  {
    "semi": true,
    "singleQuote": true,
    "trailingComma": "all",
    "printWidth": 100,
    "tabWidth": 2,
    "arrowParens": "always"
  }
  ```

- [ ] **Step 1.2.7:** Write `.prettierignore`:

  ```
  dist
  .next
  .turbo
  node_modules
  pnpm-lock.yaml
  coverage
  ```

- [ ] **Step 1.2.8:** Write `.npmrc`:

  ```
  auto-install-peers=true
  strict-peer-dependencies=false
  ```

- [ ] **Step 1.2.9:** Update `.gitignore` to the new shape:

  ```
  node_modules
  .turbo
  .next
  dist
  coverage
  *.tsbuildinfo
  .env
  .env.local
  .env.*.local
  .DS_Store
  ```

- [ ] **Step 1.2.10:** Run install to materialize the lockfile and ensure tools work:

  Run: `pnpm install`
  Expected: install completes, `pnpm-lock.yaml` regenerated, no errors.

- [ ] **Step 1.2.11:** Smoke test the tooling on the empty workspace:

  Run: `pnpm quality`
  Expected: `turbo` reports no tasks to run (no workspace packages yet) and `prettier --check .` passes. Exit 0.

  If `pnpm format:check` complains about JSON or YAML formatting, run `pnpm format` once and re-run `pnpm quality`.

- [ ] **Step 1.2.12:** Commit the tooling baseline:

  ```bash
  git add package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json \
          tsconfig.base.json eslint.config.js .prettierrc .prettierignore \
          .npmrc .gitignore
  git commit -m "chore: scaffold monorepo tooling (turbo, ts, eslint, prettier)

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

### Task 1.3: CI workflow placeholder

**Files:**
- Create or modify: `.github/workflows/ci.yml`

- [ ] **Step 1.3.1:** Write `.github/workflows/ci.yml`:

  ```yaml
  name: ci
  on:
    pull_request:
    push:
      branches: [dev, main]
  jobs:
    quality:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
          with: { version: 10.32.1 }
        - uses: actions/setup-node@v4
          with:
            node-version: 22
            cache: pnpm
        - run: pnpm install --frozen-lockfile
        - run: pnpm quality
        - run: pnpm build
  ```

- [ ] **Step 1.3.2:** Commit:

  ```bash
  git add .github/workflows/ci.yml
  git commit -m "ci: add quality + build workflow for PRs and dev/main pushes

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

### Chunk 1 acceptance

- `pnpm install` succeeds from a clean clone.
- `pnpm quality` exits 0 (turbo reports no tasks; prettier check passes).
- `pnpm build` exits 0 (no tasks).
- Working tree clean; three commits since `origin/dev`: greenfield reset (with stub CLAUDE.md), tooling, CI placeholder.

### Conventions established here that every subsequent chunk MUST follow

- Each new workspace package has a `package.json` declaring `scripts.lint`, `scripts.typecheck`, `scripts.test`, and (where it builds artifacts) `scripts.build`. If a script is not applicable, define it as `echo \"(no-op)\"` rather than omitting it — Turborepo's task graph is driven by script presence.
- Each new workspace package has a `tsconfig.json` that extends `../../tsconfig.base.json` and lists `include: ["src/**/*"]` so ESLint's `projectService` resolves it.
- Each new workspace package's `package.json` `name` follows `@perimeter/<slug>`, `version` starts at `0.0.0`, and `type: "module"`.
- Files containing JSX use the `.tsx` extension; pure-TypeScript files use `.ts`. The runtime's `mount.tsx` is `.tsx` because it renders JSX into a React root.
- Test files always `import * as React from 'react'` when their assertions reference `React.JSX.Element` or any `React.*` symbol — even if no JSX appears, because TypeScript can't infer the global JSX namespace from optional dependencies under strict ESM + `verbatimModuleSyntax`.
- `tsconfig.base.json` enables `exactOptionalPropertyTypes`, which means **every optional interface field that could legitimately receive `undefined` must be typed `field?: T | undefined`**, not just `field?: T`. This applies to every options-bag type in this plan (`MountOptions`, `MPLocalStorageAuthOptions`, `ApiClientConfig`, `PerimeterWidgetPluginOptions`, etc.). Spreading partial option objects into another bag will fail typecheck otherwise.

---

## Chunk 2: `@perimeter/theme` package

**Outcome:** A workspace package that exports the typed token map, a `resolveTokens` function for the runtime, and a Tailwind v3 preset. Unit tests cover token-name validation, override-layer resolution, unknown-token rejection, and CSS-text shape.

### Task 2.1: Scaffold the package

**Files:**
- Create: `packages/theme/package.json`
- Create: `packages/theme/tsconfig.json`
- Create: `packages/theme/vitest.config.ts`
- Create: `packages/theme/src/index.ts` (empty stub)

- [ ] **Step 2.1.1:** Create `packages/theme/package.json`:

  ```json
  {
    "name": "@perimeter/theme",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "exports": {
      ".": { "types": "./src/index.ts", "default": "./src/index.ts" },
      "./tailwind": { "types": "./src/tailwind.ts", "default": "./src/tailwind.ts" }
    },
    "scripts": {
      "build": "echo \"(no-op)\"",
      "lint": "eslint src tests",
      "typecheck": "tsc --noEmit",
      "test": "vitest run"
    },
    "dependencies": {
      "tailwindcss": "^3.4.17"
    },
    "devDependencies": {
      "@types/node": "^22.10.5",
      "@vitest/coverage-v8": "^2.1.8",
      "typescript": "^5.7.3",
      "vitest": "^2.1.8"
    }
  }
  ```

- [ ] **Step 2.1.2:** Create `packages/theme/tsconfig.json`:

  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "rootDir": ".",
      "outDir": "dist",
      "noEmit": true
    },
    "include": ["src/**/*", "tests/**/*"]
  }
  ```

- [ ] **Step 2.1.3:** Create `packages/theme/vitest.config.ts`:

  ```ts
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  });
  ```

- [ ] **Step 2.1.4:** Create an empty `packages/theme/src/index.ts`:

  ```ts
  export {};
  ```

- [ ] **Step 2.1.5:** Install. From repo root:

  Run: `pnpm install`
  Expected: pnpm picks up the new workspace package; lockfile updates with tailwindcss and vitest.

- [ ] **Step 2.1.6:** Verify the package is wired into Turborepo:

  Run: `pnpm --filter @perimeter/theme typecheck`
  Expected: exits 0 (empty package, nothing to check).

### Task 2.2: Tokens — failing test first

**Files:**
- Create: `packages/theme/tests/tokens.test.ts`

- [ ] **Step 2.2.1:** Write `packages/theme/tests/tokens.test.ts`:

  ```ts
  import { describe, it, expect } from 'vitest';
  import { globalTokens, type ThemeToken } from '../src/tokens';

  describe('globalTokens', () => {
    it('includes the Phase 1 baseline tokens', () => {
      const required: ThemeToken[] = [
        'color-bg',
        'color-fg',
        'color-muted',
        'color-muted-fg',
        'color-primary',
        'color-primary-fg',
        'color-secondary',
        'color-secondary-fg',
        'color-accent',
        'color-accent-fg',
        'color-destructive',
        'color-destructive-fg',
        'color-border',
        'color-ring',
        'radius-sm',
        'radius-md',
        'radius-lg',
        'font-sans',
        'font-mono',
      ];
      for (const key of required) {
        expect(globalTokens[key]).toBeTruthy();
      }
    });

    it('every value is a non-empty string', () => {
      for (const [key, value] of Object.entries(globalTokens)) {
        expect(typeof value).toBe('string');
        expect((value as string).length).toBeGreaterThan(0);
        void key;
      }
    });
  });
  ```

- [ ] **Step 2.2.2:** Run the test to confirm failure:

  Run: `pnpm --filter @perimeter/theme test`
  Expected: FAIL — `Cannot find module '../src/tokens'`.

### Task 2.3: Tokens — implementation

**Files:**
- Create: `packages/theme/src/tokens.ts`
- Modify: `packages/theme/src/index.ts`

- [ ] **Step 2.3.1:** Create `packages/theme/src/tokens.ts`:

  ```ts
  export const globalTokens = {
    'color-bg':            'hsl(0 0% 100%)',
    'color-fg':            'hsl(222 47% 11%)',
    'color-muted':         'hsl(210 40% 96%)',
    'color-muted-fg':      'hsl(215 16% 47%)',
    'color-primary':       'hsl(221 83% 53%)',
    'color-primary-fg':    'hsl(210 40% 98%)',
    'color-secondary':     'hsl(210 40% 96%)',
    'color-secondary-fg':  'hsl(222 47% 11%)',
    'color-accent':        'hsl(262 83% 58%)',
    'color-accent-fg':     'hsl(210 40% 98%)',
    'color-destructive':   'hsl(0 84% 60%)',
    'color-destructive-fg':'hsl(210 40% 98%)',
    'color-border':        'hsl(214 32% 91%)',
    'color-ring':          'hsl(221 83% 53%)',
    'radius-sm':           '0.25rem',
    'radius-md':           '0.5rem',
    'radius-lg':           '0.75rem',
    'font-sans':           'Inter, system-ui, -apple-system, sans-serif',
    'font-mono':           'ui-monospace, SFMono-Regular, monospace',
  } as const;

  export type ThemeToken = keyof typeof globalTokens;
  ```

- [ ] **Step 2.3.2:** Update `packages/theme/src/index.ts` to export tokens:

  ```ts
  export { globalTokens, type ThemeToken } from './tokens';
  ```

- [ ] **Step 2.3.3:** Re-run the test:

  Run: `pnpm --filter @perimeter/theme test`
  Expected: PASS — both `globalTokens` tests green.

### Task 2.4: Resolver — failing test first

**Files:**
- Create: `packages/theme/tests/resolver.test.ts`

- [ ] **Step 2.4.1:** Write `packages/theme/tests/resolver.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
  import { resolveTokens } from '../src/resolver';
  import { globalTokens } from '../src/tokens';

  describe('resolveTokens', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('returns global tokens when no overrides are passed', () => {
      const { tokens } = resolveTokens({});
      expect(tokens['color-primary']).toBe(globalTokens['color-primary']);
    });

    it('applies widget overrides over global tokens', () => {
      const { tokens } = resolveTokens({
        widgetOverrides: { 'color-primary': 'hsl(15 80% 50%)' },
      });
      expect(tokens['color-primary']).toBe('hsl(15 80% 50%)');
    });

    it('applies data-attr overrides over widget overrides', () => {
      const { tokens } = resolveTokens({
        widgetOverrides: { 'color-primary': 'hsl(15 80% 50%)' },
        dataAttrOverrides: { 'data-theme-color-primary': 'hsl(99 99% 99%)' },
      });
      expect(tokens['color-primary']).toBe('hsl(99 99% 99%)');
    });

    it('applies runtime overrides over everything else (Studio editor layer)', () => {
      const { tokens } = resolveTokens({
        widgetOverrides: { 'color-primary': 'hsl(15 80% 50%)' },
        dataAttrOverrides: { 'data-theme-color-primary': 'hsl(99 99% 99%)' },
        runtimeOverrides: { 'color-primary': 'hsl(1 1% 1%)' },
      });
      expect(tokens['color-primary']).toBe('hsl(1 1% 1%)');
    });

    it('drops unknown data-attr tokens and warns', () => {
      const { tokens } = resolveTokens({
        dataAttrOverrides: { 'data-theme-not-a-token': 'red' },
      });
      expect('not-a-token' in tokens).toBe(false);
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(String(warnSpy.mock.calls[0]?.[0])).toContain('not-a-token');
    });

    it('ignores data-* attributes that do not start with data-theme-', () => {
      resolveTokens({
        dataAttrOverrides: { 'data-limit': '6', 'data-greeting': 'Hello' },
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('produces cssText with one declaration per resolved token', () => {
      const { cssText } = resolveTokens({});
      expect(cssText.startsWith(':host')).toBe(true);
      const declCount = cssText.split('--').length - 1;
      expect(declCount).toBe(Object.keys(globalTokens).length);
    });
  });
  ```

- [ ] **Step 2.4.2:** Run the test to confirm failure:

  Run: `pnpm --filter @perimeter/theme test`
  Expected: FAIL — `Cannot find module '../src/resolver'`.

### Task 2.5: Resolver — implementation

**Files:**
- Create: `packages/theme/src/resolver.ts`
- Modify: `packages/theme/src/index.ts`

- [ ] **Step 2.5.1:** Create `packages/theme/src/resolver.ts`:

  ```ts
  import { globalTokens, type ThemeToken } from './tokens';

  const DATA_THEME_PREFIX = 'data-theme-';

  export interface ResolveTokensArgs {
    widgetOverrides?:   Partial<Record<ThemeToken, string>>;
    dataAttrOverrides?: Record<string, string>;
    runtimeOverrides?:  Partial<Record<ThemeToken, string>>;
  }

  export interface ResolvedTokens {
    tokens:  Record<ThemeToken, string>;
    cssText: string;
  }

  function isThemeToken(key: string): key is ThemeToken {
    return Object.prototype.hasOwnProperty.call(globalTokens, key);
  }

  function parseDataAttrs(input: Record<string, string>): Partial<Record<ThemeToken, string>> {
    const out: Partial<Record<ThemeToken, string>> = {};
    for (const [rawName, value] of Object.entries(input)) {
      if (!rawName.startsWith(DATA_THEME_PREFIX)) continue;
      const name = rawName.slice(DATA_THEME_PREFIX.length);
      if (!isThemeToken(name)) {
        console.warn(`[@perimeter/theme] unknown token "${name}" — dropping`);
        continue;
      }
      out[name] = value;
    }
    return out;
  }

  export function resolveTokens(args: ResolveTokensArgs): ResolvedTokens {
    const parsedDataAttrs = args.dataAttrOverrides ? parseDataAttrs(args.dataAttrOverrides) : {};
    const merged = {
      ...globalTokens,
      ...args.widgetOverrides,
      ...parsedDataAttrs,
      ...args.runtimeOverrides,
    } as Record<ThemeToken, string>;

    const decls = Object.entries(merged)
      .map(([key, value]) => `  --${key}: ${value};`)
      .join('\n');
    const cssText = `:host {\n${decls}\n}`;

    return { tokens: merged, cssText };
  }
  ```

- [ ] **Step 2.5.2:** Update `packages/theme/src/index.ts`:

  ```ts
  export { globalTokens, type ThemeToken } from './tokens';
  export { resolveTokens, type ResolveTokensArgs, type ResolvedTokens } from './resolver';
  ```

- [ ] **Step 2.5.3:** Re-run tests:

  Run: `pnpm --filter @perimeter/theme test`
  Expected: PASS — all resolver tests and tokens tests green.

### Task 2.6: Tailwind preset

**Files:**
- Create: `packages/theme/src/tailwind.ts`

- [ ] **Step 2.6.1:** Create `packages/theme/src/tailwind.ts`. Maps every token name to a Tailwind theme entry that resolves through CSS variables, so utilities like `bg-primary`, `text-fg`, `rounded-md` resolve to `var(--color-primary)`, `var(--color-fg)`, `var(--radius-md)` — the exact variables the runtime injects.

  ```ts
  import type { Config } from 'tailwindcss';
  import { globalTokens, type ThemeToken } from './tokens';

  function cssVar(token: ThemeToken): string {
    return `var(--${token})`;
  }

  const colorTokens = (Object.keys(globalTokens) as ThemeToken[]).filter((k) =>
    k.startsWith('color-'),
  );
  const radiusTokens = (Object.keys(globalTokens) as ThemeToken[]).filter((k) =>
    k.startsWith('radius-'),
  );

  const colors: Record<string, string> = {};
  for (const t of colorTokens) {
    // 'color-primary' → 'primary', 'color-primary-fg' → 'primary-fg'
    const name = t.slice('color-'.length);
    colors[name] = cssVar(t);
  }

  const borderRadius: Record<string, string> = {};
  for (const t of radiusTokens) {
    borderRadius[t.slice('radius-'.length)] = cssVar(t);
  }

  export const tailwindPreset: Config = {
    content: [],
    theme: {
      extend: {
        colors,
        borderRadius,
        fontFamily: {
          sans: [cssVar('font-sans')],
          mono: [cssVar('font-mono')],
        },
      },
    },
  };

  // Default export so `import preset from '@perimeter/theme/tailwind'` works.
  export default tailwindPreset;
  ```

- [ ] **Step 2.6.2:** Add a minimal smoke test. Create `packages/theme/tests/tailwind.test.ts`:

  ```ts
  import { describe, it, expect } from 'vitest';
  import preset from '../src/tailwind';

  describe('tailwindPreset', () => {
    it('maps every color token to a CSS variable', () => {
      const colors = (preset.theme?.extend?.colors ?? {}) as Record<string, string>;
      expect(colors['primary']).toBe('var(--color-primary)');
      expect(colors['accent']).toBe('var(--color-accent)');
      expect(colors['destructive-fg']).toBe('var(--color-destructive-fg)');
    });

    it('maps radius tokens to CSS variables', () => {
      const r = (preset.theme?.extend?.borderRadius ?? {}) as Record<string, string>;
      expect(r['md']).toBe('var(--radius-md)');
    });

    it('maps font families to CSS variables', () => {
      const f = (preset.theme?.extend?.fontFamily ?? {}) as Record<string, [string]>;
      expect(f['sans']).toEqual(['var(--font-sans)']);
    });
  });
  ```

- [ ] **Step 2.6.3:** Run tests:

  Run: `pnpm --filter @perimeter/theme test`
  Expected: PASS — all theme tests green.

### Task 2.7: Quality + commit

- [ ] **Step 2.7.1:** Run the package's full quality check:

  Run: `pnpm --filter @perimeter/theme lint && pnpm --filter @perimeter/theme typecheck && pnpm --filter @perimeter/theme test`
  Expected: all three exit 0.

- [ ] **Step 2.7.2:** Run repo-wide quality from root:

  Run: `pnpm quality`
  Expected: exits 0 across the workspace.

- [ ] **Step 2.7.3:** Commit:

  ```bash
  git add packages/theme pnpm-lock.yaml
  git commit -m "feat(theme): add @perimeter/theme package

  Source-of-truth token map, resolveTokens with the four-layer override
  order (global ← widget ← data-attr ← runtime), and a Tailwind preset
  that wires every token to its CSS variable. Tests cover layer ordering,
  unknown-token rejection, and preset shape.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

### Chunk 2 acceptance

- `packages/theme/` exists with tokens, resolver, Tailwind preset, and tests.
- `pnpm --filter @perimeter/theme test` runs 10+ assertions green.
- `pnpm quality` exits 0.
- `@perimeter/theme` is importable elsewhere in the workspace (next chunk will demonstrate this).

---

## Chunk 3: `@perimeter/ui` package

**Outcome:** Five self-contained component files (`Button`, `Card`, `Input`, `Label`, `Skeleton`) plus a small `cn` helper. Each component renders correctly with Tailwind classes that reference `@perimeter/theme` tokens. Tests cover variant rendering, prop forwarding, and accessibility basics. No barrel export — every component is imported by its file path.

### Task 3.1: Scaffold the package

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/vitest.config.ts`

- [ ] **Step 3.1.1:** Create `packages/ui/package.json`:

  ```json
  {
    "name": "@perimeter/ui",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "exports": {
      "./button":   { "types": "./src/button.tsx",   "default": "./src/button.tsx" },
      "./card":     { "types": "./src/card.tsx",     "default": "./src/card.tsx" },
      "./input":    { "types": "./src/input.tsx",    "default": "./src/input.tsx" },
      "./label":    { "types": "./src/label.tsx",    "default": "./src/label.tsx" },
      "./skeleton": { "types": "./src/skeleton.tsx", "default": "./src/skeleton.tsx" }
    },
    "scripts": {
      "build": "echo \"(no-op)\"",
      "lint": "eslint src tests",
      "typecheck": "tsc --noEmit",
      "test": "vitest run"
    },
    "dependencies": {
      "@perimeter/theme": "workspace:*",
      "@radix-ui/react-label": "^2.1.1",
      "@radix-ui/react-slot": "^1.1.1",
      "clsx": "^2.1.1",
      "react": "^19.0.0",
      "tailwind-merge": "^2.6.0"
    },
    "devDependencies": {
      "@testing-library/jest-dom": "^6.6.3",
      "@testing-library/react": "^16.1.0",
      "@types/react": "^19.0.7",
      "@types/react-dom": "^19.0.3",
      "@vitest/coverage-v8": "^2.1.8",
      "jsdom": "^25.0.1",
      "react-dom": "^19.0.0",
      "typescript": "^5.7.3",
      "vitest": "^2.1.8"
    },
    "peerDependencies": {
      "react": "^19.0.0",
      "react-dom": "^19.0.0"
    }
  }
  ```

- [ ] **Step 3.1.2:** Create `packages/ui/tsconfig.json`:

  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": { "rootDir": ".", "noEmit": true },
    "include": ["src/**/*", "tests/**/*"]
  }
  ```

- [ ] **Step 3.1.3:** Create `packages/ui/vitest.config.ts`:

  ```ts
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.{ts,tsx}'],
      setupFiles: ['./tests/setup.ts'],
    },
  });
  ```

- [ ] **Step 3.1.4:** Create `packages/ui/tests/setup.ts`:

  ```ts
  import '@testing-library/jest-dom/vitest';
  ```

- [ ] **Step 3.1.5:** Install:

  Run: `pnpm install`
  Expected: dependencies resolve, lockfile updates.

### Task 3.2: `cn` utility

**Files:**
- Create: `packages/ui/src/utils/cn.ts`

- [ ] **Step 3.2.1:** Create `packages/ui/src/utils/cn.ts`:

  ```ts
  import { clsx, type ClassValue } from 'clsx';
  import { twMerge } from 'tailwind-merge';

  export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
  }
  ```

  No test file for `cn` itself — the components' tests exercise it. The whole module is six lines; an extra test file would be ceremony.

### Task 3.3: `Button` — failing test first

**Files:**
- Create: `packages/ui/tests/button.test.tsx`

- [ ] **Step 3.3.1:** Write `packages/ui/tests/button.test.tsx`:

  ```tsx
  import { describe, it, expect } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import { Button } from '../src/button';

  describe('Button', () => {
    it('renders children', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('applies the primary variant by default', () => {
      render(<Button>Go</Button>);
      const el = screen.getByRole('button');
      expect(el.className).toContain('bg-primary');
    });

    it('applies the secondary variant when requested', () => {
      render(<Button variant="secondary">Go</Button>);
      expect(screen.getByRole('button').className).toContain('bg-secondary');
    });

    it('applies the ghost variant when requested', () => {
      render(<Button variant="ghost">Go</Button>);
      const el = screen.getByRole('button');
      expect(el.className).not.toContain('bg-primary');
      expect(el.className).toContain('hover:bg-muted');
    });

    it('forwards arbitrary props to the underlying button', () => {
      render(<Button data-testid="x" disabled>Go</Button>);
      const el = screen.getByTestId('x');
      expect(el).toBeDisabled();
    });

    it('merges custom className', () => {
      render(<Button className="custom-class">Go</Button>);
      expect(screen.getByRole('button').className).toContain('custom-class');
    });
  });
  ```

- [ ] **Step 3.3.2:** Run to confirm failure:

  Run: `pnpm --filter @perimeter/ui test`
  Expected: FAIL — `Cannot find module '../src/button'`.

### Task 3.4: `Button` — implementation

**Files:**
- Create: `packages/ui/src/button.tsx`

- [ ] **Step 3.4.1:** Create `packages/ui/src/button.tsx`:

  ```tsx
  import * as React from 'react';
  import { cn } from './utils/cn';

  export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
  }

  const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:   'bg-primary text-primary-fg hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-fg hover:bg-secondary/80',
    ghost:     'bg-transparent text-fg hover:bg-muted',
  };

  const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-9 px-4 text-sm',
    lg: 'h-11 px-6 text-base',
  };

  export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    function Button({ variant = 'primary', size = 'md', className, ...rest }, ref) {
      return (
        <button
          ref={ref}
          className={cn(
            'inline-flex items-center justify-center rounded-md font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:pointer-events-none disabled:opacity-50',
            variantClasses[variant],
            sizeClasses[size],
            className,
          )}
          {...rest}
        />
      );
    },
  );
  ```

- [ ] **Step 3.4.2:** Re-run tests:

  Run: `pnpm --filter @perimeter/ui test`
  Expected: PASS — all six `Button` assertions green.

### Task 3.5: `Card` — test then implementation

**Files:**
- Create: `packages/ui/tests/card.test.tsx`
- Create: `packages/ui/src/card.tsx`

- [ ] **Step 3.5.1:** Write `packages/ui/tests/card.test.tsx`:

  ```tsx
  import { describe, it, expect } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import { Card, CardHeader, CardTitle, CardContent } from '../src/card';

  describe('Card', () => {
    it('renders a region with content', () => {
      render(<Card data-testid="card">hello</Card>);
      expect(screen.getByTestId('card')).toHaveTextContent('hello');
    });

    it('composes header, title, and content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
          <CardContent>Body</CardContent>
        </Card>,
      );
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Body')).toBeInTheDocument();
    });

    it('applies border and bg classes', () => {
      render(<Card data-testid="card" />);
      const el = screen.getByTestId('card');
      expect(el.className).toContain('border');
      expect(el.className).toContain('bg-bg');
    });
  });
  ```

- [ ] **Step 3.5.2:** Confirm failure:

  Run: `pnpm --filter @perimeter/ui test`
  Expected: FAIL — `Cannot find module '../src/card'`.

- [ ] **Step 3.5.3:** Create `packages/ui/src/card.tsx`:

  ```tsx
  import * as React from 'react';
  import { cn } from './utils/cn';

  export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    function Card({ className, ...rest }, ref) {
      return (
        <div
          ref={ref}
          className={cn('rounded-lg border border-border bg-bg text-fg shadow-sm', className)}
          {...rest}
        />
      );
    },
  );

  export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    function CardHeader({ className, ...rest }, ref) {
      return <div ref={ref} className={cn('flex flex-col gap-1.5 p-6', className)} {...rest} />;
    },
  );

  export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    function CardTitle({ className, ...rest }, ref) {
      return <h3 ref={ref} className={cn('text-lg font-semibold leading-none', className)} {...rest} />;
    },
  );

  export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    function CardContent({ className, ...rest }, ref) {
      return <div ref={ref} className={cn('p-6 pt-0', className)} {...rest} />;
    },
  );
  ```

- [ ] **Step 3.5.4:** Re-run tests:

  Run: `pnpm --filter @perimeter/ui test`
  Expected: PASS — Card tests green.

### Task 3.6: `Input` — test then implementation

**Files:**
- Create: `packages/ui/tests/input.test.tsx`
- Create: `packages/ui/src/input.tsx`

- [ ] **Step 3.6.1:** Write `packages/ui/tests/input.test.tsx`:

  ```tsx
  import { describe, it, expect } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import { Input } from '../src/input';

  describe('Input', () => {
    it('renders an <input>', () => {
      render(<Input placeholder="name" />);
      expect(screen.getByPlaceholderText('name')).toBeInstanceOf(HTMLInputElement);
    });

    it('forwards type', () => {
      render(<Input type="email" placeholder="email" />);
      const el = screen.getByPlaceholderText('email') as HTMLInputElement;
      expect(el.type).toBe('email');
    });

    it('applies border + ring classes', () => {
      render(<Input data-testid="i" />);
      const el = screen.getByTestId('i');
      expect(el.className).toContain('border-border');
      expect(el.className).toContain('focus-visible:ring-ring');
    });
  });
  ```

- [ ] **Step 3.6.2:** Confirm failure (same `Cannot find module` pattern). Run: `pnpm --filter @perimeter/ui test`. Expected: FAIL.

- [ ] **Step 3.6.3:** Create `packages/ui/src/input.tsx`:

  ```tsx
  import * as React from 'react';
  import { cn } from './utils/cn';

  export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    function Input({ className, type = 'text', ...rest }, ref) {
      return (
        <input
          ref={ref}
          type={type}
          className={cn(
            'flex h-9 w-full rounded-md border border-border bg-bg px-3 py-1 text-sm text-fg',
            'placeholder:text-muted-fg',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          {...rest}
        />
      );
    },
  );
  ```

- [ ] **Step 3.6.4:** Re-run: `pnpm --filter @perimeter/ui test`. Expected: PASS.

### Task 3.7: `Label` — test then implementation

**Files:**
- Create: `packages/ui/tests/label.test.tsx`
- Create: `packages/ui/src/label.tsx`

- [ ] **Step 3.7.1:** Write `packages/ui/tests/label.test.tsx`:

  ```tsx
  import { describe, it, expect } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import { Label } from '../src/label';

  describe('Label', () => {
    it('renders children as a label', () => {
      render(<Label htmlFor="x">Name</Label>);
      const el = screen.getByText('Name');
      expect(el.tagName).toBe('LABEL');
      expect(el.getAttribute('for')).toBe('x');
    });

    it('applies typography classes', () => {
      render(<Label>Name</Label>);
      expect(screen.getByText('Name').className).toContain('text-sm');
    });
  });
  ```

- [ ] **Step 3.7.2:** Confirm failure. Run: `pnpm --filter @perimeter/ui test`. Expected: FAIL.

- [ ] **Step 3.7.3:** Create `packages/ui/src/label.tsx`:

  ```tsx
  import * as React from 'react';
  import * as LabelPrimitive from '@radix-ui/react-label';
  import { cn } from './utils/cn';

  export const Label = React.forwardRef<
    React.ElementRef<typeof LabelPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
  >(function Label({ className, ...rest }, ref) {
    return (
      <LabelPrimitive.Root
        ref={ref}
        className={cn('text-sm font-medium leading-none text-fg', className)}
        {...rest}
      />
    );
  });
  ```

- [ ] **Step 3.7.4:** Re-run: `pnpm --filter @perimeter/ui test`. Expected: PASS.

### Task 3.8: `Skeleton` — test then implementation

**Files:**
- Create: `packages/ui/tests/skeleton.test.tsx`
- Create: `packages/ui/src/skeleton.tsx`

- [ ] **Step 3.8.1:** Write `packages/ui/tests/skeleton.test.tsx`:

  ```tsx
  import { describe, it, expect } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import { Skeleton } from '../src/skeleton';

  describe('Skeleton', () => {
    it('renders a placeholder div', () => {
      render(<Skeleton data-testid="s" />);
      const el = screen.getByTestId('s');
      expect(el.tagName).toBe('DIV');
      expect(el.className).toContain('animate-pulse');
      expect(el.className).toContain('bg-muted');
    });

    it('merges custom className', () => {
      render(<Skeleton data-testid="s" className="h-10 w-20" />);
      expect(screen.getByTestId('s').className).toContain('h-10');
    });
  });
  ```

- [ ] **Step 3.8.2:** Confirm failure. Run: `pnpm --filter @perimeter/ui test`. Expected: FAIL.

- [ ] **Step 3.8.3:** Create `packages/ui/src/skeleton.tsx`:

  ```tsx
  import * as React from 'react';
  import { cn } from './utils/cn';

  export function Skeleton({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
    return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...rest} />;
  }
  ```

- [ ] **Step 3.8.4:** Re-run: `pnpm --filter @perimeter/ui test`. Expected: PASS.

### Task 3.9: Quality + commit

- [ ] **Step 3.9.1:** Run package quality:

  Run: `pnpm --filter @perimeter/ui lint && pnpm --filter @perimeter/ui typecheck && pnpm --filter @perimeter/ui test`
  Expected: all three exit 0.

- [ ] **Step 3.9.2:** Run repo-wide quality:

  Run: `pnpm quality`
  Expected: exits 0.

- [ ] **Step 3.9.3:** Commit:

  ```bash
  git add packages/ui pnpm-lock.yaml
  git commit -m "feat(ui): add @perimeter/ui starter components

  Button, Card, Input, Label, Skeleton — each in its own file, each
  exported by subpath so widgets tree-shake correctly. Components
  consume @perimeter/theme tokens through Tailwind utility classes.
  Tests cover variant rendering, prop forwarding, and class composition.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

### Chunk 3 acceptance

- Five components live under `packages/ui/src/`, each in its own file.
- `pnpm --filter @perimeter/ui test` exercises every component.
- Each component only imports `react`, the local `cn` helper, and at most one Radix peer primitive — no cross-package internal imports.
- `pnpm quality` exits 0.

---

## Chunk 4: `@perimeter/auth` + `@perimeter/api-client`

**Outcome:** Two small packages. `@perimeter/auth` exports the `AuthProvider` interface and `MPLocalStorageAuth` implementation; `@perimeter/api-client` exports `createApiClient({ baseUrl, auth? })` returning a `fetch` wrapper that attaches the bearer token when present. Both are unit-tested.

### Task 4.1: Scaffold `@perimeter/auth`

**Files:**
- Create: `packages/auth/package.json`
- Create: `packages/auth/tsconfig.json`
- Create: `packages/auth/vitest.config.ts`

- [ ] **Step 4.1.1:** Create `packages/auth/package.json`:

  ```json
  {
    "name": "@perimeter/auth",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "exports": {
      ".": { "types": "./src/index.ts", "default": "./src/index.ts" }
    },
    "scripts": {
      "build": "echo \"(no-op)\"",
      "lint": "eslint src tests",
      "typecheck": "tsc --noEmit",
      "test": "vitest run"
    },
    "devDependencies": {
      "@vitest/coverage-v8": "^2.1.8",
      "jsdom": "^25.0.1",
      "typescript": "^5.7.3",
      "vitest": "^2.1.8"
    }
  }
  ```

- [ ] **Step 4.1.2:** Create `packages/auth/tsconfig.json`:

  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": { "rootDir": ".", "noEmit": true },
    "include": ["src/**/*", "tests/**/*"]
  }
  ```

- [ ] **Step 4.1.3:** Create `packages/auth/vitest.config.ts`:

  ```ts
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] },
  });
  ```

- [ ] **Step 4.1.4:** Run: `pnpm install`. Expected: workspace updated.

### Task 4.2: `AuthProvider` interface + `MPLocalStorageAuth` — failing tests first

**Files:**
- Create: `packages/auth/tests/mp-local-storage-auth.test.ts`

- [ ] **Step 4.2.1:** Write `packages/auth/tests/mp-local-storage-auth.test.ts`:

  ```ts
  import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
  import { MPLocalStorageAuth } from '../src/mp-local-storage-auth';

  const TOKEN_KEY = 'mpp-widgets_AuthToken';
  const EXP_KEY = 'mpp-widgets_ExpiresAfter';

  describe('MPLocalStorageAuth', () => {
    beforeEach(() => {
      localStorage.clear();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns null when no token is present', () => {
      const auth = new MPLocalStorageAuth();
      expect(auth.getToken()).toBeNull();
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('returns the token when present and not expired', () => {
      localStorage.setItem(TOKEN_KEY, 'abc');
      localStorage.setItem(EXP_KEY, String(Date.now() + 60_000));
      const auth = new MPLocalStorageAuth();
      expect(auth.getToken()).toBe('abc');
      expect(auth.isAuthenticated()).toBe(true);
    });

    it('treats an expired token as no token', () => {
      localStorage.setItem(TOKEN_KEY, 'abc');
      localStorage.setItem(EXP_KEY, String(Date.now() - 1));
      const auth = new MPLocalStorageAuth();
      expect(auth.getToken()).toBeNull();
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('notifies onChange listeners when a "storage" event fires for the token key', () => {
      const auth = new MPLocalStorageAuth({ pollIntervalMs: 0 });
      const cb = vi.fn();
      const off = auth.onChange(cb);
      localStorage.setItem(TOKEN_KEY, 'new');
      window.dispatchEvent(new StorageEvent('storage', { key: TOKEN_KEY, newValue: 'new' }));
      expect(cb).toHaveBeenCalledWith('new');
      off();
    });

    it('polls localStorage when pollIntervalMs > 0', () => {
      vi.useFakeTimers();
      const auth = new MPLocalStorageAuth({ pollIntervalMs: 100 });
      const cb = vi.fn();
      auth.onChange(cb);
      localStorage.setItem(TOKEN_KEY, 'polled');
      vi.advanceTimersByTime(150);
      expect(cb).toHaveBeenCalledWith('polled');
    });

    it('respects custom token/expires keys', () => {
      localStorage.setItem('custom_token', 'X');
      localStorage.setItem('custom_exp', String(Date.now() + 60_000));
      const auth = new MPLocalStorageAuth({ tokenKey: 'custom_token', expiresKey: 'custom_exp' });
      expect(auth.getToken()).toBe('X');
    });
  });
  ```

- [ ] **Step 4.2.2:** Run: `pnpm --filter @perimeter/auth test`. Expected: FAIL — module not found.

### Task 4.3: `AuthProvider` + `MPLocalStorageAuth` — implementation

**Files:**
- Create: `packages/auth/src/types.ts`
- Create: `packages/auth/src/mp-local-storage-auth.ts`
- Create: `packages/auth/src/index.ts`

- [ ] **Step 4.3.1:** Create `packages/auth/src/types.ts`:

  ```ts
  export interface AuthProvider {
    getToken():        string | null;
    isAuthenticated(): boolean;
    onChange(cb: (token: string | null) => void): () => void;
  }
  ```

- [ ] **Step 4.3.2:** Create `packages/auth/src/mp-local-storage-auth.ts`:

  ```ts
  import type { AuthProvider } from './types';

  export interface MPLocalStorageAuthOptions {
    tokenKey?:       string | undefined;
    expiresKey?:     string | undefined;
    pollIntervalMs?: number | undefined;
  }

  const DEFAULT_TOKEN_KEY = 'mpp-widgets_AuthToken';
  const DEFAULT_EXP_KEY = 'mpp-widgets_ExpiresAfter';
  const DEFAULT_POLL = 1000;

  export class MPLocalStorageAuth implements AuthProvider {
    private readonly tokenKey:   string;
    private readonly expiresKey: string;
    private readonly pollMs:     number;
    private listeners = new Set<(token: string | null) => void>();
    private lastNotified: string | null;
    private storageHandler: (e: StorageEvent) => void;
    private pollHandle: ReturnType<typeof setInterval> | null = null;

    constructor(opts: MPLocalStorageAuthOptions = {}) {
      this.tokenKey = opts.tokenKey ?? DEFAULT_TOKEN_KEY;
      this.expiresKey = opts.expiresKey ?? DEFAULT_EXP_KEY;
      this.pollMs = opts.pollIntervalMs ?? DEFAULT_POLL;
      this.lastNotified = this.getToken();
      this.storageHandler = (e) => {
        if (e.key === this.tokenKey || e.key === this.expiresKey) this.maybeNotify();
      };
      window.addEventListener('storage', this.storageHandler);
      if (this.pollMs > 0) {
        this.pollHandle = setInterval(() => this.maybeNotify(), this.pollMs);
      }
    }

    getToken(): string | null {
      const raw = localStorage.getItem(this.tokenKey);
      if (raw == null) return null;
      const expStr = localStorage.getItem(this.expiresKey);
      if (expStr != null) {
        const exp = Number(expStr);
        if (Number.isFinite(exp) && Date.now() > exp) return null;
      }
      return raw;
    }

    isAuthenticated(): boolean {
      return this.getToken() !== null;
    }

    onChange(cb: (token: string | null) => void): () => void {
      this.listeners.add(cb);
      return () => { this.listeners.delete(cb); };
    }

    /** Stop polling and listening. Used by tests and on widget unmount. */
    dispose(): void {
      window.removeEventListener('storage', this.storageHandler);
      if (this.pollHandle != null) clearInterval(this.pollHandle);
      this.listeners.clear();
    }

    private maybeNotify(): void {
      const current = this.getToken();
      if (current === this.lastNotified) return;
      this.lastNotified = current;
      for (const cb of this.listeners) cb(current);
    }
  }
  ```

- [ ] **Step 4.3.3:** Create `packages/auth/src/index.ts`:

  ```ts
  export type { AuthProvider } from './types';
  export { MPLocalStorageAuth, type MPLocalStorageAuthOptions } from './mp-local-storage-auth';
  ```

- [ ] **Step 4.3.4:** Re-run tests:

  Run: `pnpm --filter @perimeter/auth test`
  Expected: PASS — all six MPLocalStorageAuth tests green.

### Task 4.4: Scaffold `@perimeter/api-client`

**Files:**
- Create: `packages/api-client/package.json`
- Create: `packages/api-client/tsconfig.json`
- Create: `packages/api-client/vitest.config.ts`

- [ ] **Step 4.4.1:** Create `packages/api-client/package.json`:

  ```json
  {
    "name": "@perimeter/api-client",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "exports": {
      ".": { "types": "./src/index.ts", "default": "./src/index.ts" }
    },
    "scripts": {
      "build": "echo \"(no-op)\"",
      "lint": "eslint src tests",
      "typecheck": "tsc --noEmit",
      "test": "vitest run"
    },
    "dependencies": {
      "@perimeter/auth": "workspace:*"
    },
    "devDependencies": {
      "@vitest/coverage-v8": "^2.1.8",
      "typescript": "^5.7.3",
      "vitest": "^2.1.8"
    }
  }
  ```

- [ ] **Step 4.4.2:** Create `packages/api-client/tsconfig.json`:

  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": { "rootDir": ".", "noEmit": true },
    "include": ["src/**/*", "tests/**/*"]
  }
  ```

- [ ] **Step 4.4.3:** Create `packages/api-client/vitest.config.ts`:

  ```ts
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  });
  ```

- [ ] **Step 4.4.4:** Run: `pnpm install`.

### Task 4.5: `createApiClient` — failing test first

**Files:**
- Create: `packages/api-client/tests/create-api-client.test.ts`

- [ ] **Step 4.5.1:** Write `packages/api-client/tests/create-api-client.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { createApiClient } from '../src/create-api-client';
  import type { AuthProvider } from '@perimeter/auth';

  function fakeAuth(token: string | null): AuthProvider {
    return {
      getToken: () => token,
      isAuthenticated: () => token !== null,
      onChange: () => () => {},
    };
  }

  describe('createApiClient', () => {
    let fetchSpy: ReturnType<typeof vi.fn>;
    beforeEach(() => {
      fetchSpy = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
      globalThis.fetch = fetchSpy as unknown as typeof fetch;
    });

    it('prefixes paths with baseUrl', async () => {
      const client = createApiClient({ baseUrl: 'https://api.example.com' });
      await client.fetch('/sermons');
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.example.com/sermons',
        expect.any(Object),
      );
    });

    it('adds Authorization header when auth provides a token', async () => {
      const client = createApiClient({ baseUrl: 'https://api.example.com', auth: fakeAuth('xyz') });
      await client.fetch('/me');
      const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
      const headers = new Headers(init.headers);
      expect(headers.get('Authorization')).toBe('Bearer xyz');
    });

    it('omits Authorization header when auth has no token', async () => {
      const client = createApiClient({ baseUrl: 'https://api.example.com', auth: fakeAuth(null) });
      await client.fetch('/public');
      const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
      const headers = new Headers(init.headers);
      expect(headers.has('Authorization')).toBe(false);
    });

    it('omits Authorization when no auth is configured', async () => {
      const client = createApiClient({ baseUrl: 'https://api.example.com' });
      await client.fetch('/public');
      const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
      const headers = new Headers(init.headers);
      expect(headers.has('Authorization')).toBe(false);
    });

    it('preserves caller-supplied headers', async () => {
      const client = createApiClient({ baseUrl: 'https://api.example.com', auth: fakeAuth('t') });
      await client.fetch('/x', { headers: { 'X-Trace': '1' } });
      const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
      const headers = new Headers(init.headers);
      expect(headers.get('X-Trace')).toBe('1');
      expect(headers.get('Authorization')).toBe('Bearer t');
    });

    it('handles a baseUrl with a trailing slash and a path with a leading slash', async () => {
      const client = createApiClient({ baseUrl: 'https://api.example.com/' });
      await client.fetch('/x');
      expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/x', expect.any(Object));
    });
  });
  ```

- [ ] **Step 4.5.2:** Confirm failure. Run: `pnpm --filter @perimeter/api-client test`. Expected: FAIL.

### Task 4.6: `createApiClient` — implementation

**Files:**
- Create: `packages/api-client/src/create-api-client.ts`
- Create: `packages/api-client/src/index.ts`

- [ ] **Step 4.6.1:** Create `packages/api-client/src/create-api-client.ts`:

  ```ts
  import type { AuthProvider } from '@perimeter/auth';

  export interface ApiClientConfig {
    baseUrl: string;
    auth?:   AuthProvider | undefined;
  }

  export interface ApiClient {
    fetch: (path: string, init?: RequestInit) => Promise<Response>;
  }

  function joinUrl(base: string, path: string): string {
    const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const trimmedPath = path.startsWith('/') ? path : `/${path}`;
    return `${trimmedBase}${trimmedPath}`;
  }

  export function createApiClient(config: ApiClientConfig): ApiClient {
    return {
      async fetch(path, init = {}) {
        const headers = new Headers(init.headers);
        const token = config.auth?.getToken() ?? null;
        if (token) headers.set('Authorization', `Bearer ${token}`);
        return fetch(joinUrl(config.baseUrl, path), { ...init, headers });
      },
    };
  }
  ```

- [ ] **Step 4.6.2:** Create `packages/api-client/src/index.ts`:

  ```ts
  export { createApiClient, type ApiClient, type ApiClientConfig } from './create-api-client';
  ```

- [ ] **Step 4.6.3:** Re-run tests:

  Run: `pnpm --filter @perimeter/api-client test`
  Expected: PASS — all six tests green.

### Task 4.7: Quality + commit

- [ ] **Step 4.7.1:** Lint, typecheck, test both packages:

  Run:
  ```bash
  pnpm --filter @perimeter/auth lint && pnpm --filter @perimeter/auth typecheck && pnpm --filter @perimeter/auth test
  pnpm --filter @perimeter/api-client lint && pnpm --filter @perimeter/api-client typecheck && pnpm --filter @perimeter/api-client test
  ```
  Expected: all six commands exit 0.

- [ ] **Step 4.7.2:** Repo-wide:

  Run: `pnpm quality`
  Expected: exits 0.

- [ ] **Step 4.7.3:** Commit:

  ```bash
  git add packages/auth packages/api-client pnpm-lock.yaml
  git commit -m "feat(auth,api-client): add AuthProvider interface and fetch wrapper

  @perimeter/auth defines the AuthProvider interface and ships
  MPLocalStorageAuth reading mpp-widgets_AuthToken from localStorage
  (storage event + optional poll). @perimeter/api-client exports
  createApiClient that injects the bearer token from any AuthProvider.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

### Chunk 4 acceptance

- `MPLocalStorageAuth` reads/expires/observes the MP token contract.
- `createApiClient` joins URLs, injects auth header when present, preserves caller headers, omits auth when absent.
- `pnpm quality` exits 0.

---

## Chunk 5: `@perimeter/widget-runtime`

**Outcome:** The runtime package that turns a `WidgetDefinition` into a mounted widget. Includes the public `defineWidget` API, mount/auto-mount/native-render entry points, all providers, an error boundary, an auth gate, the live-instance registry, the CSS map, and the `window.PerimeterWidgets` global. Every internal piece has its own file; every public API has a test.

### Task 5.1: Scaffold

**Files:**
- Create: `packages/widget-runtime/package.json`
- Create: `packages/widget-runtime/tsconfig.json`
- Create: `packages/widget-runtime/vitest.config.ts`
- Create: `packages/widget-runtime/tests/setup.ts`

- [ ] **Step 5.1.1:** Create `packages/widget-runtime/package.json`:

  ```json
  {
    "name": "@perimeter/widget-runtime",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "exports": {
      ".": { "types": "./src/index.ts", "default": "./src/index.ts" }
    },
    "scripts": {
      "build": "echo \"(no-op)\"",
      "lint": "eslint src tests",
      "typecheck": "tsc --noEmit",
      "test": "vitest run"
    },
    "dependencies": {
      "@perimeter/api-client": "workspace:*",
      "@perimeter/auth": "workspace:*",
      "@perimeter/theme": "workspace:*",
      "@tanstack/react-query": "^5.62.7",
      "react": "^19.0.0",
      "react-dom": "^19.0.0",
      "zod": "^3.24.1"
    },
    "devDependencies": {
      "@testing-library/jest-dom": "^6.6.3",
      "@testing-library/react": "^16.1.0",
      "@types/react": "^19.0.7",
      "@types/react-dom": "^19.0.3",
      "@vitest/coverage-v8": "^2.1.8",
      "jsdom": "^25.0.1",
      "typescript": "^5.7.3",
      "vitest": "^2.1.8"
    },
    "peerDependencies": {
      "react": "^19.0.0",
      "react-dom": "^19.0.0"
    }
  }
  ```

- [ ] **Step 5.1.2:** Create `packages/widget-runtime/tsconfig.json`:

  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": { "rootDir": ".", "noEmit": true },
    "include": ["src/**/*", "tests/**/*"]
  }
  ```

- [ ] **Step 5.1.3:** Create `packages/widget-runtime/vitest.config.ts`:

  ```ts
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.{ts,tsx}'],
      setupFiles: ['./tests/setup.ts'],
    },
  });
  ```

- [ ] **Step 5.1.4:** Create `packages/widget-runtime/tests/setup.ts`:

  ```ts
  import '@testing-library/jest-dom/vitest';
  ```

- [ ] **Step 5.1.5:** Run: `pnpm install`.

### Task 5.2: `data-attrs` parser — test then implementation

**Files:**
- Create: `packages/widget-runtime/tests/data-attrs.test.ts`
- Create: `packages/widget-runtime/src/data-attrs.ts`

- [ ] **Step 5.2.1:** Write `packages/widget-runtime/tests/data-attrs.test.ts`:

  ```ts
  import { describe, it, expect } from 'vitest';
  import { z } from 'zod';
  import { parseDataAttrs } from '../src/data-attrs';

  function divWith(attrs: Record<string, string>): HTMLElement {
    const el = document.createElement('div');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  const schema = z.object({
    seriesId: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    initialView: z.enum(['grid', 'list']).default('grid'),
  });

  describe('parseDataAttrs', () => {
    it('parses non-theme data-* attributes into config using the schema', () => {
      const el = divWith({ 'data-series-id': 'abc', 'data-limit': '6' });
      const { config } = parseDataAttrs(el, schema);
      expect(config).toEqual({ seriesId: 'abc', limit: 6, initialView: 'grid' });
    });

    it('returns data-theme-* attributes separately', () => {
      const el = divWith({
        'data-limit': '3',
        'data-theme-color-primary': 'hsl(15 80% 50%)',
        'data-theme-radius-md': '4px',
      });
      const { themeOverrides } = parseDataAttrs(el, schema);
      expect(themeOverrides).toEqual({
        'data-theme-color-primary': 'hsl(15 80% 50%)',
        'data-theme-radius-md': '4px',
      });
    });

    it('converts kebab-case attribute names to camelCase for config keys', () => {
      const el = divWith({ 'data-initial-view': 'list' });
      const { config } = parseDataAttrs(el, schema);
      expect(config.initialView).toBe('list');
    });

    it('throws a descriptive error when validation fails', () => {
      const el = divWith({ 'data-limit': '999' });
      expect(() => parseDataAttrs(el, schema)).toThrow(/limit/);
    });

    it('ignores the data-perimeter-widget marker attribute', () => {
      const el = divWith({ 'data-perimeter-widget': 'sermons', 'data-limit': '3' });
      const { config } = parseDataAttrs(el, schema);
      expect(config.limit).toBe(3);
      expect(Object.keys(config)).not.toContain('perimeterWidget');
    });
  });
  ```

- [ ] **Step 5.2.2:** Run: FAIL expected.

- [ ] **Step 5.2.3:** Create `packages/widget-runtime/src/data-attrs.ts`:

  ```ts
  import type { z } from 'zod';

  const THEME_PREFIX = 'data-theme-';
  const MARKER = 'data-perimeter-widget';

  function kebabToCamel(s: string): string {
    return s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  }

  export interface ParsedAttrs<T> {
    config:         T;
    themeOverrides: Record<string, string>;
  }

  export function parseDataAttrs<S extends z.ZodTypeAny>(
    el: HTMLElement,
    schema: S,
  ): ParsedAttrs<z.infer<S>> {
    const rawConfig: Record<string, string> = {};
    const themeOverrides: Record<string, string> = {};

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name;
      if (!name.startsWith('data-')) continue;
      if (name === MARKER) continue;
      if (name.startsWith(THEME_PREFIX)) {
        themeOverrides[name] = attr.value;
        continue;
      }
      const key = kebabToCamel(name.slice('data-'.length));
      rawConfig[key] = attr.value;
    }

    const config = schema.parse(rawConfig) as z.infer<S>;
    return { config, themeOverrides };
  }
  ```

- [ ] **Step 5.2.4:** Re-run: PASS expected.

### Task 5.3: Registry (CSS map + live instances) — test then implementation

**Files:**
- Create: `packages/widget-runtime/tests/registry.test.ts`
- Create: `packages/widget-runtime/src/registry.ts`

- [ ] **Step 5.3.1:** Write `packages/widget-runtime/tests/registry.test.ts`:

  ```ts
  import { describe, it, expect, beforeEach } from 'vitest';
  import {
    registerCss,
    getCss,
    registerInstance,
    deregisterInstance,
    getInstances,
    clearAll,
  } from '../src/registry';

  describe('registry', () => {
    beforeEach(() => clearAll());

    it('stores and retrieves CSS by widget name', () => {
      registerCss('sermons', '.foo { color: red; }');
      expect(getCss('sermons')).toBe('.foo { color: red; }');
    });

    it('returns undefined for unknown CSS name', () => {
      expect(getCss('nope')).toBeUndefined();
    });

    it('tracks live instances per widget name', () => {
      const handle1 = { unmount: () => {}, updateTokens: () => {} };
      const handle2 = { unmount: () => {}, updateTokens: () => {} };
      registerInstance('sermons', handle1);
      registerInstance('sermons', handle2);
      registerInstance('events', handle1);
      expect(getInstances('sermons')).toHaveLength(2);
      expect(getInstances('events')).toHaveLength(1);
    });

    it('deregisters instances cleanly', () => {
      const handle = { unmount: () => {}, updateTokens: () => {} };
      registerInstance('sermons', handle);
      deregisterInstance('sermons', handle);
      expect(getInstances('sermons')).toHaveLength(0);
    });
  });
  ```

- [ ] **Step 5.3.2:** Run: FAIL expected.

- [ ] **Step 5.3.3:** Create `packages/widget-runtime/src/registry.ts`:

  ```ts
  export interface InstanceHandle {
    unmount(): void;
    /** Called by applyOverrides to re-resolve tokens on this instance. */
    updateTokens(overrides: Record<string, string>): void;
  }

  const cssMap = new Map<string, string>();
  const instances = new Map<string, Set<InstanceHandle>>();

  export function registerCss(name: string, cssText: string): void {
    cssMap.set(name, cssText);
  }

  export function getCss(name: string): string | undefined {
    return cssMap.get(name);
  }

  export function registerInstance(name: string, handle: InstanceHandle): void {
    let set = instances.get(name);
    if (!set) {
      set = new Set();
      instances.set(name, set);
    }
    set.add(handle);
  }

  export function deregisterInstance(name: string, handle: InstanceHandle): void {
    instances.get(name)?.delete(handle);
  }

  export function getInstances(name: string): InstanceHandle[] {
    return Array.from(instances.get(name) ?? []);
  }

  export function clearAll(): void {
    cssMap.clear();
    instances.clear();
  }
  ```

- [ ] **Step 5.3.4:** Re-run: PASS expected.

### Task 5.4: ErrorBoundary — test then implementation

**Files:**
- Create: `packages/widget-runtime/tests/error-boundary.test.tsx`
- Create: `packages/widget-runtime/src/providers/error-boundary.tsx`

- [ ] **Step 5.4.1:** Write `packages/widget-runtime/tests/error-boundary.test.tsx`:

  ```tsx
  import * as React from 'react';
  import { describe, it, expect } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import { ErrorBoundary } from '../src/providers/error-boundary';

  function Boom(): React.JSX.Element {
    throw new Error('boom');
  }

  describe('ErrorBoundary', () => {
    it('renders children when nothing throws', () => {
      render(<ErrorBoundary widgetName="x"><div>ok</div></ErrorBoundary>);
      expect(screen.getByText('ok')).toBeInTheDocument();
    });

    it('renders a fallback when a child throws', () => {
      // Silence React's expected error log in test output.
      const original = console.error;
      console.error = () => {};
      try {
        render(<ErrorBoundary widgetName="x"><Boom /></ErrorBoundary>);
        expect(screen.getByRole('alert')).toHaveTextContent(/error/i);
      } finally {
        console.error = original;
      }
    });
  });
  ```

- [ ] **Step 5.4.2:** Run: FAIL expected.

- [ ] **Step 5.4.3:** Create `packages/widget-runtime/src/providers/error-boundary.tsx`:

  ```tsx
  import * as React from 'react';

  interface Props {
    widgetName: string;
    children:   React.ReactNode;
  }
  interface State {
    error: Error | null;
  }

  export class ErrorBoundary extends React.Component<Props, State> {
    override state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
      return { error };
    }

    override componentDidCatch(error: Error): void {
      // Surfaced in dev tools; in production this becomes a telemetry hook.
      console.error(`[perimeter-widget:${this.props.widgetName}]`, error);
    }

    override render(): React.ReactNode {
      if (this.state.error) {
        return (
          <div role="alert" style={{ padding: '0.5rem', fontSize: '0.875rem', color: '#7a1a1a' }}>
            This widget encountered an error.
          </div>
        );
      }
      return this.props.children;
    }
  }
  ```

- [ ] **Step 5.4.4:** Re-run: PASS expected.

### Task 5.5: AuthProvider context + useAuth hook

**Files:**
- Create: `packages/widget-runtime/src/providers/auth-provider.tsx`
- Create: `packages/widget-runtime/src/hooks/use-auth.ts`

No standalone test — covered by `auth-gate.test.tsx` in Task 5.6 and by the mount integration test in Task 5.10.

- [ ] **Step 5.5.1:** Create `packages/widget-runtime/src/providers/auth-provider.tsx`:

  ```tsx
  import * as React from 'react';
  import type { AuthProvider as AuthProviderImpl } from '@perimeter/auth';

  export const AuthProviderContext = React.createContext<AuthProviderImpl | null>(null);

  export function AuthProviderProvider(props: {
    value:    AuthProviderImpl;
    children: React.ReactNode;
  }): React.JSX.Element {
    return <AuthProviderContext.Provider value={props.value}>{props.children}</AuthProviderContext.Provider>;
  }
  ```

- [ ] **Step 5.5.2:** Create `packages/widget-runtime/src/hooks/use-auth.ts`:

  ```ts
  import * as React from 'react';
  import type { AuthProvider } from '@perimeter/auth';
  import { AuthProviderContext } from '../providers/auth-provider';

  export function useAuth(): AuthProvider {
    const ctx = React.useContext(AuthProviderContext);
    if (!ctx) throw new Error('useAuth() called outside a mounted Perimeter widget');
    return ctx;
  }
  ```

### Task 5.6: AuthGate — test then implementation

**Files:**
- Create: `packages/widget-runtime/tests/auth-gate.test.tsx`
- Create: `packages/widget-runtime/src/providers/auth-gate.tsx`

- [ ] **Step 5.6.1:** Write `packages/widget-runtime/tests/auth-gate.test.tsx`:

  ```tsx
  import { describe, it, expect } from 'vitest';
  import { render, screen, act } from '@testing-library/react';
  import { AuthProviderProvider } from '../src/providers/auth-provider';
  import { AuthGate } from '../src/providers/auth-gate';
  import type { AuthProvider as IAuth } from '@perimeter/auth';

  function fakeAuth(initial: string | null): IAuth & { _emit: (t: string | null) => void } {
    const listeners = new Set<(t: string | null) => void>();
    let token = initial;
    return {
      getToken: () => token,
      isAuthenticated: () => token !== null,
      onChange: (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
      _emit: (t) => { token = t; listeners.forEach((cb) => cb(t)); },
    };
  }

  describe('AuthGate', () => {
    it('renders children when auth is "none"', () => {
      const auth = fakeAuth(null);
      render(
        <AuthProviderProvider value={auth}>
          <AuthGate widgetName="x" mode="none"><div>hi</div></AuthGate>
        </AuthProviderProvider>,
      );
      expect(screen.getByText('hi')).toBeInTheDocument();
    });

    it('renders children when auth is "optional"', () => {
      const auth = fakeAuth(null);
      render(
        <AuthProviderProvider value={auth}>
          <AuthGate widgetName="x" mode="optional"><div>hi</div></AuthGate>
        </AuthProviderProvider>,
      );
      expect(screen.getByText('hi')).toBeInTheDocument();
    });

    it('blocks children with a sign-in prompt when "required" and no token', () => {
      const auth = fakeAuth(null);
      render(
        <AuthProviderProvider value={auth}>
          <AuthGate widgetName="x" mode="required"><div>hi</div></AuthGate>
        </AuthProviderProvider>,
      );
      expect(screen.queryByText('hi')).toBeNull();
      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    });

    it('re-renders children when a token appears', () => {
      const auth = fakeAuth(null);
      render(
        <AuthProviderProvider value={auth}>
          <AuthGate widgetName="x" mode="required"><div>hi</div></AuthGate>
        </AuthProviderProvider>,
      );
      expect(screen.queryByText('hi')).toBeNull();
      act(() => { auth._emit('abc'); });
      expect(screen.getByText('hi')).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 5.6.2:** Run: FAIL expected.

- [ ] **Step 5.6.3:** Create `packages/widget-runtime/src/providers/auth-gate.tsx`:

  ```tsx
  import * as React from 'react';
  import { useAuth } from '../hooks/use-auth';

  export interface AuthGateProps {
    widgetName: string;
    mode:       'required' | 'optional' | 'none';
    children:   React.ReactNode;
  }

  export function AuthGate({ mode, children }: AuthGateProps): React.JSX.Element {
    const auth = useAuth();
    const [authed, setAuthed] = React.useState<boolean>(auth.isAuthenticated());

    React.useEffect(() => {
      return auth.onChange(() => setAuthed(auth.isAuthenticated()));
    }, [auth]);

    if (mode !== 'required' || authed) return <>{children}</>;
    return (
      <div role="status" style={{ padding: '1rem', fontSize: '0.875rem' }}>
        Please sign in to use this widget.
      </div>
    );
  }
  ```

- [ ] **Step 5.6.4:** Re-run: PASS expected.

### Task 5.7: ThemeProvider + QueryProvider + useApiClient hook

**Files:**
- Create: `packages/widget-runtime/src/providers/theme-provider.tsx`
- Create: `packages/widget-runtime/src/providers/query-provider.tsx`
- Create: `packages/widget-runtime/src/hooks/use-api-client.ts`

Covered by the mount integration test in Task 5.10. No standalone tests.

- [ ] **Step 5.7.1:** Create `packages/widget-runtime/src/providers/theme-provider.tsx`:

  ```tsx
  import * as React from 'react';

  export interface ThemeProviderProps {
    cssText:  string;          // resolved by resolveTokens()
    children: React.ReactNode;
  }

  export function ThemeProvider({ cssText, children }: ThemeProviderProps): React.JSX.Element {
    return (
      <>
        <style data-perimeter-theme>{cssText}</style>
        {children}
      </>
    );
  }
  ```

- [ ] **Step 5.7.2:** Create `packages/widget-runtime/src/providers/query-provider.tsx`:

  ```tsx
  import * as React from 'react';
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

  export function makeWidgetQueryClient(): QueryClient {
    return new QueryClient({
      defaultOptions: {
        queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
      },
    });
  }

  export function QueryProvider(props: {
    client:   QueryClient;
    children: React.ReactNode;
  }): React.JSX.Element {
    return <QueryClientProvider client={props.client}>{props.children}</QueryClientProvider>;
  }
  ```

- [ ] **Step 5.7.3:** Create `packages/widget-runtime/src/hooks/use-api-client.ts`. The api client itself is created at mount time and passed in via context. Add a small context next to the hook:

  ```ts
  import * as React from 'react';
  import type { ApiClient } from '@perimeter/api-client';

  export const ApiClientContext = React.createContext<ApiClient | null>(null);

  export function useApiClient(): ApiClient {
    const ctx = React.useContext(ApiClientContext);
    if (!ctx) throw new Error('useApiClient() called outside a mounted Perimeter widget');
    return ctx;
  }
  ```

### Task 5.8: `defineWidget` — test then implementation

**Files:**
- Create: `packages/widget-runtime/tests/define-widget.test.tsx`
- Create: `packages/widget-runtime/src/define-widget.ts`

- [ ] **Step 5.8.1:** Write `packages/widget-runtime/tests/define-widget.test.tsx`:

  ```tsx
  import * as React from 'react';
  import { describe, it, expect } from 'vitest';
  import { z } from 'zod';
  import { defineWidget } from '../src/define-widget';

  describe('defineWidget', () => {
    it('returns the definition as-is, preserving fields', () => {
      const schema = z.object({ x: z.string() });
      const App = ({ config }: { config: { x: string } }): React.JSX.Element => <div>{config.x}</div>;
      const def = defineWidget({
        name: 'example',
        auth: 'none',
        schema,
        themeOverrides: { 'color-primary': 'red' },
        App,
      });
      expect(def.name).toBe('example');
      expect(def.auth).toBe('none');
      expect(def.schema).toBe(schema);
      expect(def.themeOverrides).toEqual({ 'color-primary': 'red' });
      expect(def.App).toBe(App);
    });
  });
  ```

- [ ] **Step 5.8.2:** Run: FAIL expected.

- [ ] **Step 5.8.3:** Create `packages/widget-runtime/src/define-widget.ts`:

  ```ts
  import type * as React from 'react';
  import type { z } from 'zod';
  import type { AuthProvider } from '@perimeter/auth';
  import type { ThemeToken } from '@perimeter/theme';

  export type AuthMode = 'required' | 'optional' | 'none';

  export interface DefineWidgetOptions<S extends z.ZodTypeAny> {
    name:            string;
    auth:            AuthMode;
    schema:          S;
    themeOverrides?: Partial<Record<ThemeToken, string>>;
    App:             React.ComponentType<{ config: z.infer<S>; auth: AuthProvider }>;
  }

  export interface WidgetDefinition<S extends z.ZodTypeAny = z.ZodTypeAny> {
    name:            string;
    auth:            AuthMode;
    schema:          S;
    themeOverrides?: Partial<Record<ThemeToken, string>>;
    App:             React.ComponentType<{ config: z.infer<S>; auth: AuthProvider }>;
    /** Populated by the vite plugin at build time from package.json. */
    version?:        string;
  }

  export function defineWidget<S extends z.ZodTypeAny>(opts: DefineWidgetOptions<S>): WidgetDefinition<S> {
    return { ...opts };
  }
  ```

- [ ] **Step 5.8.4:** Re-run: PASS expected.

### Task 5.9: Mount + nativeRender — test then implementation

**Files:**
- Create: `packages/widget-runtime/tests/mount.test.tsx`
- Create: `packages/widget-runtime/src/mount.tsx`
- Create: `packages/widget-runtime/src/native-render.ts`

- [ ] **Step 5.9.1:** Write `packages/widget-runtime/tests/mount.test.tsx`:

  ```tsx
  import * as React from 'react';
  import { describe, it, expect, beforeEach, vi } from 'vitest';
  import { z } from 'zod';
  import { mountWidget } from '../src/mount';
  import { nativeRender } from '../src/native-render';
  import { defineWidget } from '../src/define-widget';
  import { clearAll, registerCss, getInstances } from '../src/registry';

  const schema = z.object({ greeting: z.string().default('Hello'), count: z.coerce.number().default(1) });

  const definition = defineWidget({
    name: 'example',
    auth: 'none',
    schema,
    App({ config }) {
      return <div data-testid="content">{config.greeting} x{config.count}</div>;
    },
  });

  describe('mountWidget', () => {
    beforeEach(() => {
      clearAll();
      registerCss('example', ':host { --color-primary: red; }');
      document.body.innerHTML = '';
    });

    it('mounts the widget into a shadow root and renders the App', async () => {
      const target = document.createElement('div');
      target.setAttribute('data-greeting', 'Hi');
      target.setAttribute('data-count', '3');
      document.body.appendChild(target);

      const handle = mountWidget({ definition, target });
      await vi.waitFor(() => {
        const root = target.shadowRoot;
        expect(root).not.toBeNull();
        expect(root!.querySelector('[data-testid="content"]')?.textContent).toBe('Hi x3');
      });
      expect(getInstances('example')).toHaveLength(1);
      handle.unmount();
    });

    it('unmount removes the React tree and deregisters the instance', async () => {
      const target = document.createElement('div');
      document.body.appendChild(target);
      const handle = mountWidget({ definition, target });
      await vi.waitFor(() => expect(target.shadowRoot?.querySelector('[data-testid="content"]')).not.toBeNull());
      handle.unmount();
      expect(getInstances('example')).toHaveLength(0);
      // After unmount the shadow root no longer contains the testid node.
      expect(target.shadowRoot?.querySelector('[data-testid="content"]')).toBeNull();
    });

    it('injects the resolved token CSS variables', async () => {
      const target = document.createElement('div');
      document.body.appendChild(target);
      mountWidget({ definition, target });
      await vi.waitFor(() => {
        const styleEls = target.shadowRoot!.querySelectorAll('style');
        const combined = Array.from(styleEls).map((s) => s.textContent ?? '').join('\n');
        expect(combined).toContain('--color-primary');
      });
    });
  });

  describe('nativeRender', () => {
    it('renders inside a shadow root attached to the provided target', async () => {
      const target = document.createElement('div');
      const host = document.createElement('div');
      document.body.appendChild(target);
      document.body.appendChild(host);
      const handle = nativeRender({ definition, target, hostRoot: host });
      await vi.waitFor(() => {
        expect(target.shadowRoot?.querySelector('[data-testid="content"]')).not.toBeNull();
      });
      handle.unmount();
    });
  });
  ```

- [ ] **Step 5.9.2:** Run: FAIL expected.

- [ ] **Step 5.9.3:** Create `packages/widget-runtime/src/mount.tsx` (note `.tsx` — this file contains JSX):

  ```ts
  import * as React from 'react';
  import { createRoot, type Root } from 'react-dom/client';
  import { MPLocalStorageAuth, type AuthProvider } from '@perimeter/auth';
  import { createApiClient } from '@perimeter/api-client';
  import { resolveTokens } from '@perimeter/theme';
  import type { WidgetDefinition } from './define-widget';
  import { parseDataAttrs } from './data-attrs';
  import {
    deregisterInstance,
    getCss,
    type InstanceHandle,
    registerInstance,
  } from './registry';
  import { AuthProviderProvider } from './providers/auth-provider';
  import { AuthGate } from './providers/auth-gate';
  import { ErrorBoundary } from './providers/error-boundary';
  import { ThemeProvider } from './providers/theme-provider';
  import { makeWidgetQueryClient, QueryProvider } from './providers/query-provider';
  import { ApiClientContext } from './hooks/use-api-client';

  const DEFAULT_API_URL =
    (typeof globalThis !== 'undefined' && (globalThis as { __PERIMETER_API_URL__?: string }).__PERIMETER_API_URL__) ||
    'https://api.perimeter.org';

  export interface MountOptions {
    definition:       WidgetDefinition;
    target:           HTMLElement;
    configOverrides?: Record<string, unknown> | undefined;
    apiBaseUrl?:      string | undefined;
    authFactory?:     (() => AuthProvider) | undefined;
  }

  export interface MountedWidget extends InstanceHandle {
    unmount(): void;
  }

  export function mountWidget(opts: MountOptions): MountedWidget {
    const { definition, target } = opts;

    const { config, themeOverrides: dataAttrThemeOverrides } = parseDataAttrs(target, definition.schema);
    const mergedConfig = { ...config, ...(opts.configOverrides ?? {}) };
    let runtimeOverrides: Record<string, string> = {};

    const shadow = target.shadowRoot ?? target.attachShadow({ mode: 'open' });
    // Clear any previous mount in this shadow root.
    while (shadow.firstChild) shadow.removeChild(shadow.firstChild);

    function buildCss(): string {
      const { cssText } = resolveTokens({
        widgetOverrides: definition.themeOverrides,
        dataAttrOverrides: dataAttrThemeOverrides,
        runtimeOverrides,
      });
      const widgetCss = getCss(definition.name) ?? '';
      return `${cssText}\n${widgetCss}`;
    }

    const auth = (opts.authFactory ?? (() => new MPLocalStorageAuth()))();
    const apiClient = createApiClient({ baseUrl: opts.apiBaseUrl ?? DEFAULT_API_URL, auth });

    const reactRoot = document.createElement('div');
    shadow.appendChild(reactRoot);
    const root: Root = createRoot(reactRoot);
    const queryClient = makeWidgetQueryClient();
    const App = definition.App;

    function render(): void {
      root.render(
        <ErrorBoundary widgetName={definition.name}>
          <ThemeProvider cssText={buildCss()}>
            <AuthProviderProvider value={auth}>
              <AuthGate widgetName={definition.name} mode={definition.auth}>
                <ApiClientContext.Provider value={apiClient}>
                  <QueryProvider client={queryClient}>
                    <App config={mergedConfig as never} auth={auth} />
                  </QueryProvider>
                </ApiClientContext.Provider>
              </AuthGate>
            </AuthProviderProvider>
          </ThemeProvider>
        </ErrorBoundary>,
      );
    }

    const handle: MountedWidget = {
      unmount() {
        root.unmount();
        while (shadow.firstChild) shadow.removeChild(shadow.firstChild);
        deregisterInstance(definition.name, handle);
      },
      updateTokens(overrides) {
        runtimeOverrides = overrides;
        render();
      },
    };
    registerInstance(definition.name, handle);
    render();
    return handle;
  }
  ```

- [ ] **Step 5.9.4:** Create `packages/widget-runtime/src/native-render.ts`:

  ```ts
  import { mountWidget, type MountOptions, type MountedWidget } from './mount';

  /**
   * Studio uses this entry to render a widget natively (React owned by the host app).
   * Identical to mountWidget today; the `hostRoot` argument is reserved for future use
   * (e.g. portaling overlays out of the shadow root).
   */
  export function nativeRender(opts: MountOptions & { hostRoot: HTMLElement }): MountedWidget {
    void opts.hostRoot;
    return mountWidget(opts);
  }
  ```

- [ ] **Step 5.9.5:** Re-run: PASS expected.

### Task 5.10: `autoMount` + MutationObserver — test then implementation

**Files:**
- Create: `packages/widget-runtime/tests/auto-mount.test.tsx`
- Create: `packages/widget-runtime/src/auto-mount.ts`

- [ ] **Step 5.10.1:** Write `packages/widget-runtime/tests/auto-mount.test.tsx`:

  ```tsx
  import * as React from 'react';
  import { describe, it, expect, beforeEach, vi } from 'vitest';
  import { z } from 'zod';
  import { defineWidget } from '../src/define-widget';
  import { autoMount, disposeAutoMount } from '../src/auto-mount';
  import { clearAll, registerCss } from '../src/registry';

  const def = defineWidget({
    name: 'example',
    auth: 'none',
    schema: z.object({ greeting: z.string().default('Hello') }),
    App({ config }) {
      return <span data-testid="x">{config.greeting}</span>;
    },
  });

  describe('autoMount', () => {
    beforeEach(() => {
      clearAll();
      registerCss('example', ':host { --color-primary: red; }');
      document.body.innerHTML = '';
      disposeAutoMount();
    });

    it('mounts every matching target present at call time', async () => {
      const a = document.createElement('div');
      a.setAttribute('data-perimeter-widget', 'example');
      const b = document.createElement('div');
      b.setAttribute('data-perimeter-widget', 'example');
      document.body.append(a, b);
      autoMount(def);
      await vi.waitFor(() => {
        expect(a.shadowRoot?.querySelector('[data-testid="x"]')).not.toBeNull();
        expect(b.shadowRoot?.querySelector('[data-testid="x"]')).not.toBeNull();
      });
    });

    it('mounts targets added to the DOM after autoMount runs', async () => {
      autoMount(def);
      const c = document.createElement('div');
      c.setAttribute('data-perimeter-widget', 'example');
      document.body.append(c);
      await vi.waitFor(() => {
        expect(c.shadowRoot?.querySelector('[data-testid="x"]')).not.toBeNull();
      });
    });

    it('ignores targets for other widget names', async () => {
      const other = document.createElement('div');
      other.setAttribute('data-perimeter-widget', 'sermons');
      document.body.append(other);
      autoMount(def);
      // Give the observer a tick; nothing should mount.
      await new Promise((r) => setTimeout(r, 20));
      expect(other.shadowRoot).toBeNull();
    });

    it('does not double-mount when called twice', async () => {
      const a = document.createElement('div');
      a.setAttribute('data-perimeter-widget', 'example');
      document.body.append(a);
      autoMount(def);
      autoMount(def);
      await vi.waitFor(() => {
        const styleCount = a.shadowRoot!.querySelectorAll('[data-perimeter-theme]').length;
        expect(styleCount).toBe(1);
      });
    });
  });
  ```

- [ ] **Step 5.10.2:** Run: FAIL expected.

- [ ] **Step 5.10.3:** Create `packages/widget-runtime/src/auto-mount.ts`:

  ```ts
  import type { WidgetDefinition } from './define-widget';
  import { mountWidget } from './mount';

  const MARKER = 'data-perimeter-widget';
  const MOUNTED = '__perimeterMounted';

  type ObserverHandle = { observer: MutationObserver; def: WidgetDefinition };
  const observers = new Map<string, ObserverHandle>();

  function mountIfMatch(def: WidgetDefinition, el: Element): void {
    if (!(el instanceof HTMLElement)) return;
    if (el.getAttribute(MARKER) !== def.name) return;
    const node = el as HTMLElement & { [MOUNTED]?: boolean };
    if (node[MOUNTED]) return;
    node[MOUNTED] = true;
    mountWidget({ definition: def, target: el });
  }

  export function autoMount(def: WidgetDefinition): void {
    // Mount existing targets.
    document
      .querySelectorAll<HTMLElement>(`[${MARKER}="${def.name}"]`)
      .forEach((el) => mountIfMatch(def, el));

    if (observers.has(def.name)) return;

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            mountIfMatch(def, node);
            node.querySelectorAll<HTMLElement>(`[${MARKER}="${def.name}"]`).forEach((el) => mountIfMatch(def, el));
          }
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    observers.set(def.name, { observer, def });
  }

  /** Test helper: tear down all observers. */
  export function disposeAutoMount(): void {
    for (const { observer } of observers.values()) observer.disconnect();
    observers.clear();
  }
  ```

- [ ] **Step 5.10.4:** Re-run: PASS expected.

### Task 5.11: `window.PerimeterWidgets` global — test then implementation

**Files:**
- Create: `packages/widget-runtime/tests/global.test.tsx`
- Create: `packages/widget-runtime/src/global.ts`

- [ ] **Step 5.11.1:** Write `packages/widget-runtime/tests/global.test.tsx`:

  ```tsx
  import * as React from 'react';
  import { describe, it, expect, beforeEach, vi } from 'vitest';
  import { z } from 'zod';
  import { defineWidget } from '../src/define-widget';
  import { ensureGlobal } from '../src/global';
  import { clearAll, registerCss } from '../src/registry';
  import { mountWidget } from '../src/mount';

  const def = defineWidget({
    name: 'example',
    auth: 'none',
    schema: z.object({}),
    App: () => <div data-testid="x">ok</div>,
  });

  describe('window.PerimeterWidgets', () => {
    beforeEach(() => {
      clearAll();
      registerCss('example', ':host {}');
      (window as unknown as { PerimeterWidgets?: unknown }).PerimeterWidgets = undefined;
      document.body.innerHTML = '';
    });

    it('attaches the definition under its name', () => {
      ensureGlobal(def);
      expect(window.PerimeterWidgets['example']).toBe(def);
    });

    it('applyOverrides re-renders every live instance with new tokens', async () => {
      ensureGlobal(def);
      const a = document.createElement('div');
      document.body.appendChild(a);
      mountWidget({ definition: def, target: a });
      await vi.waitFor(() => expect(a.shadowRoot?.querySelector('[data-testid="x"]')).not.toBeNull());

      window.PerimeterWidgets.applyOverrides('example', { 'color-primary': 'hsl(99 99% 99%)' });
      const styleEls = a.shadowRoot!.querySelectorAll('style');
      const combined = Array.from(styleEls).map((s) => s.textContent ?? '').join('\n');
      expect(combined).toContain('--color-primary: hsl(99 99% 99%)');
    });

    it('mount() returns a MountedWidget that can be unmounted', () => {
      ensureGlobal(def);
      const target = document.createElement('div');
      document.body.appendChild(target);
      const handle = window.PerimeterWidgets.mount('example', target);
      expect(target.shadowRoot).not.toBeNull();
      handle.unmount();
    });
  });
  ```

- [ ] **Step 5.11.2:** Run: FAIL expected.

- [ ] **Step 5.11.3:** Create `packages/widget-runtime/src/global.ts`:

  ```ts
  import type { ThemeToken } from '@perimeter/theme';
  import type { WidgetDefinition } from './define-widget';
  import { getInstances } from './registry';
  import { mountWidget, type MountedWidget } from './mount';

  export interface PerimeterWidgetsGlobal {
    [name: string]: WidgetDefinition;
    applyOverrides(name: string, overrides: Partial<Record<ThemeToken, string>>): void;
    mount(name: string, target: HTMLElement, configOverrides?: Record<string, unknown>): MountedWidget;
  }

  declare global {
    interface Window {
      PerimeterWidgets: PerimeterWidgetsGlobal;
    }
  }

  function getOrCreate(): PerimeterWidgetsGlobal {
    const existing = (window as { PerimeterWidgets?: PerimeterWidgetsGlobal }).PerimeterWidgets;
    if (existing) return existing;
    const fresh: PerimeterWidgetsGlobal = {
      applyOverrides(name, overrides) {
        for (const handle of getInstances(name)) {
          handle.updateTokens(overrides as Record<string, string>);
        }
      },
      mount(name, target, configOverrides) {
        const def = (fresh as Record<string, unknown>)[name] as WidgetDefinition | undefined;
        if (!def) throw new Error(`No widget registered with name "${name}"`);
        return mountWidget({ definition: def, target, configOverrides });
      },
    };
    window.PerimeterWidgets = fresh;
    return fresh;
  }

  export function ensureGlobal(def: WidgetDefinition): void {
    const g = getOrCreate();
    (g as Record<string, unknown>)[def.name] = def;
  }
  ```

- [ ] **Step 5.11.4:** Re-run: PASS expected.

### Task 5.12: Public exports

**Files:**
- Create: `packages/widget-runtime/src/index.ts`

- [ ] **Step 5.12.1:** Create `packages/widget-runtime/src/index.ts`:

  ```ts
  export { defineWidget, type DefineWidgetOptions, type WidgetDefinition, type AuthMode } from './define-widget';
  export { mountWidget, type MountOptions, type MountedWidget } from './mount';
  export { nativeRender } from './native-render';
  export { autoMount } from './auto-mount';
  export { ensureGlobal, type PerimeterWidgetsGlobal } from './global';
  export { registerCss, getCss } from './registry';
  export { useAuth } from './hooks/use-auth';
  export { useApiClient } from './hooks/use-api-client';
  ```

### Task 5.13: Quality + commit

- [ ] **Step 5.13.1:** Run package quality:

  Run: `pnpm --filter @perimeter/widget-runtime lint && pnpm --filter @perimeter/widget-runtime typecheck && pnpm --filter @perimeter/widget-runtime test`
  Expected: exits 0.

- [ ] **Step 5.13.2:** Run repo-wide:

  Run: `pnpm quality`
  Expected: exits 0.

- [ ] **Step 5.13.3:** Commit:

  ```bash
  git add packages/widget-runtime pnpm-lock.yaml
  git commit -m "feat(widget-runtime): add core runtime (defineWidget, mount, providers, global)

  Implements the convention-driven framework from the Phase 1 spec:
  data-attr parsing into typed config + theme overrides, a per-name
  CSS + live-instance registry, ThemeProvider/AuthProvider/AuthGate/
  QueryProvider/ErrorBoundary, mountWidget rendering into a shadow
  root, autoMount with MutationObserver-based late mounting, and the
  window.PerimeterWidgets global with applyOverrides + manual mount.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

### Chunk 5 acceptance

- All runtime tests pass (data-attrs, registry, error-boundary, auth-gate, define-widget, mount, native-render, auto-mount, global) — 25+ assertions.
- The runtime mounts a widget into a shadow root with theme variables + widget CSS injected.
- `applyOverrides` updates a live instance's CSS variables.
- `MutationObserver`-based late mounting works.
- `pnpm quality` exits 0.

---

## Chunk 6: `@perimeter/vite-plugin-widget`

**Outcome:** A Vite plugin that turns a widget package's `defineWidget` default export into an IIFE bundle. The plugin emits a virtual entry module that imports the widget's definition + bundled CSS (via `?inline`), then calls `registerCss`, `ensureGlobal`, and `autoMount`. The plugin also configures Vite's `build.lib` settings: IIFE format, the configured `globalName`, single CSS file, React and ReactDOM bundled in.

### Task 6.1: Scaffold

**Files:**
- Create: `packages/vite-plugin-widget/package.json`
- Create: `packages/vite-plugin-widget/tsconfig.json`
- Create: `packages/vite-plugin-widget/vitest.config.ts`

- [ ] **Step 6.1.1:** Create `packages/vite-plugin-widget/package.json`:

  ```json
  {
    "name": "@perimeter/vite-plugin-widget",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "exports": {
      ".": { "types": "./src/index.ts", "default": "./src/index.ts" }
    },
    "scripts": {
      "build": "echo \"(no-op)\"",
      "lint": "eslint src tests",
      "typecheck": "tsc --noEmit",
      "test": "vitest run"
    },
    "dependencies": {
      "@perimeter/widget-runtime": "workspace:*"
    },
    "peerDependencies": {
      "vite": "^6.0.0"
    },
    "devDependencies": {
      "@types/node": "^22.10.5",
      "@vitest/coverage-v8": "^2.1.8",
      "typescript": "^5.7.3",
      "vite": "^6.0.7",
      "vitest": "^2.1.8"
    }
  }
  ```

- [ ] **Step 6.1.2:** Create `packages/vite-plugin-widget/tsconfig.json`:

  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": { "rootDir": ".", "noEmit": true },
    "include": ["src/**/*", "tests/**/*"]
  }
  ```

- [ ] **Step 6.1.3:** Create `packages/vite-plugin-widget/vitest.config.ts`:

  ```ts
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  });
  ```

- [ ] **Step 6.1.4:** Run: `pnpm install`.

### Task 6.2: Virtual entry source builder — test then implementation

**Files:**
- Create: `packages/vite-plugin-widget/tests/virtual-entry.test.ts`
- Create: `packages/vite-plugin-widget/src/virtual-entry.ts`

- [ ] **Step 6.2.1:** Write `packages/vite-plugin-widget/tests/virtual-entry.test.ts`:

  ```ts
  import { describe, it, expect } from 'vitest';
  import { buildVirtualEntry, CSS_PLACEHOLDER } from '../src/virtual-entry';

  describe('buildVirtualEntry', () => {
    it('imports the user entry, references the CSS placeholder, and calls runtime hooks', () => {
      const code = buildVirtualEntry({ entryId: '/abs/widgets/example/src/index.ts', version: '1.2.3' });
      expect(code).toContain('import definition from');
      expect(code).toContain('/abs/widgets/example/src/index.ts');
      // JSON.stringify('1.2.3') → "1.2.3"
      expect(code).toContain('"1.2.3"');
      expect(code).toContain(CSS_PLACEHOLDER);
      expect(code).toContain('registerCss(def.name');
      expect(code).toContain('ensureGlobal(def)');
      expect(code).toContain('autoMount(def)');
    });

    it('escapes backslashes in the entry path (Windows-style)', () => {
      const code = buildVirtualEntry({ entryId: 'C:\\widgets\\example\\src\\index.ts', version: '0.0.0' });
      // JSON.stringify doubles backslashes, so the import path uses escaped form.
      expect(code).toContain('C:\\\\widgets\\\\example\\\\src\\\\index.ts');
    });
  });
  ```

- [ ] **Step 6.2.2:** Run: FAIL expected.

- [ ] **Step 6.2.3:** Create `packages/vite-plugin-widget/src/virtual-entry.ts`. The CSS is wired through a build-time placeholder string (not a `?inline` virtual import — Vite does not graft project CSS into virtual modules that way). The plugin's `generateBundle` hook substitutes the placeholder with the bundle's emitted CSS asset content.

  ```ts
  export interface BuildVirtualEntryArgs {
    entryId: string;
    version: string;
  }

  export const VIRTUAL_ENTRY_ID = '\0perimeter-widget-entry';

  /**
   * Sentinel string the plugin replaces at generateBundle time with the
   * processed CSS content (Tailwind + user CSS) for this widget.
   * Wrapped in JSON.stringify so it is a valid string literal in the
   * emitted JS until the plugin rewrites it.
   */
  export const CSS_PLACEHOLDER = '__PERIMETER_WIDGET_CSS_$$_PLACEHOLDER_$$__';

  export function buildVirtualEntry({ entryId, version }: BuildVirtualEntryArgs): string {
    return [
      `import definition from ${JSON.stringify(entryId)};`,
      `import { autoMount, ensureGlobal, registerCss } from '@perimeter/widget-runtime';`,
      ``,
      `const widgetCss = ${JSON.stringify(CSS_PLACEHOLDER)};`,
      `const def = { ...definition, version: ${JSON.stringify(version)} };`,
      `registerCss(def.name, widgetCss);`,
      `ensureGlobal(def);`,
      `autoMount(def);`,
      ``,
    ].join('\n');
  }
  ```

- [ ] **Step 6.2.4:** Re-run: PASS expected.

### Task 6.3: The plugin — test then implementation

**Files:**
- Create: `packages/vite-plugin-widget/tests/plugin.test.ts`
- Create: `packages/vite-plugin-widget/src/plugin.ts`
- Create: `packages/vite-plugin-widget/src/index.ts`

- [ ] **Step 6.3.1:** Write `packages/vite-plugin-widget/tests/plugin.test.ts`. This test exercises the plugin via Vite's `build()` API against a temporary fixture, which is realistic but slower than a unit test. Keep it focused.

  ```ts
  import { describe, it, expect, beforeEach, afterEach } from 'vitest';
  import { build } from 'vite';
  import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
  import { tmpdir } from 'node:os';
  import path from 'node:path';
  import { perimeterWidget } from '../src/plugin';

  describe('perimeterWidget plugin', () => {
    let dir: string;

    beforeEach(async () => {
      dir = await mkdtemp(path.join(tmpdir(), 'perimeter-widget-'));
      await mkdir(path.join(dir, 'src'), { recursive: true });
      await writeFile(
        path.join(dir, 'package.json'),
        JSON.stringify({ name: 'fixture-widget', version: '4.5.6', type: 'module' }),
      );
      await writeFile(
        path.join(dir, 'src', 'index.ts'),
        `export default { name: 'fixture', auth: 'none', schema: { parse: (x) => x }, App: () => null };`,
      );
    });

    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it('emits a single IIFE bundle named after the widget name, with the version baked in', async () => {
      await build({ root: dir, logLevel: 'silent', plugins: [perimeterWidget({ name: 'fixture' })] });
      const out = await readFile(path.join(dir, 'dist', 'fixture.iife.js'), 'utf8');
      expect(out).toContain('4.5.6');
      expect(out).toMatch(/^\(function/);
    });

    it('honors a custom globalName option', async () => {
      await build({
        root: dir,
        logLevel: 'silent',
        plugins: [perimeterWidget({ name: 'fixture', globalName: 'MyGlobal' })],
      });
      const out = await readFile(path.join(dir, 'dist', 'fixture.iife.js'), 'utf8');
      expect(out).toContain('MyGlobal');
    });

    it('inlines processed CSS into the JS chunk and emits no standalone CSS asset', async () => {
      await writeFile(path.join(dir, 'src', 'styles.css'), `.perimeter-fixture-css-sentinel { color: red; }`);
      // Re-write the entry so it imports the CSS.
      await writeFile(
        path.join(dir, 'src', 'index.ts'),
        `import './styles.css';
         export default { name: 'fixture', auth: 'none', schema: { parse: (x) => x }, App: () => null };`,
      );
      await build({ root: dir, logLevel: 'silent', plugins: [perimeterWidget({ name: 'fixture' })] });
      const out = await readFile(path.join(dir, 'dist', 'fixture.iife.js'), 'utf8');
      expect(out).toContain('perimeter-fixture-css-sentinel');
      // No standalone CSS file in dist.
      const files = await readdir(path.join(dir, 'dist'));
      expect(files.some((f) => f.endsWith('.css'))).toBe(false);
    });
  });
  ```

- [ ] **Step 6.3.2:** Run: FAIL expected.

- [ ] **Step 6.3.3:** Create `packages/vite-plugin-widget/src/plugin.ts`. The plugin requires an explicit `name` option matching the widget's `defineWidget({ name })` — the IIFE filename and `dist/` path are derived from this, not from `package.json#name`. (This avoids the npm-scope-stripping ambiguity that bit us in the first review pass.)

  ```ts
  import { readFileSync } from 'node:fs';
  import path from 'node:path';
  import type { Plugin } from 'vite';
  import { buildVirtualEntry, VIRTUAL_ENTRY_ID, CSS_PLACEHOLDER } from './virtual-entry';

  export interface PerimeterWidgetPluginOptions {
    /** Widget name — MUST match the value in defineWidget({ name }). Required. */
    name: string;
    /** Path to the widget's source entry, relative to the package root. Defaults to 'src/index.ts'. */
    entry?: string | undefined;
    /** IIFE global name. Defaults to `PerimeterWidget_<name>`. */
    globalName?: string | undefined;
  }

  export function perimeterWidget(options: PerimeterWidgetPluginOptions): Plugin {
    let pkgVersion = '0.0.0';
    let entryAbsPath = '';
    const globalName = options.globalName ?? `PerimeterWidget_${options.name}`;
    const fileName = `${options.name}.iife.js`;

    return {
      name: '@perimeter/vite-plugin-widget',
      enforce: 'pre',

      config(_userConfig, env) {
        const root = process.cwd();
        const pkgJsonPath = path.join(root, 'package.json');
        const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8')) as { version?: string };
        pkgVersion = pkg.version ?? '0.0.0';
        entryAbsPath = path.resolve(root, options.entry ?? 'src/index.ts');
        return {
          build: {
            lib: {
              entry: VIRTUAL_ENTRY_ID,
              name: globalName,
              formats: ['iife'],
              fileName: () => fileName,
            },
            cssCodeSplit: false,
            sourcemap: true,
            emptyOutDir: env.command === 'build',
          },
        };
      },

      resolveId(id) {
        if (id === VIRTUAL_ENTRY_ID) return VIRTUAL_ENTRY_ID;
        return null;
      },

      load(id) {
        if (id === VIRTUAL_ENTRY_ID) {
          return buildVirtualEntry({ entryId: entryAbsPath, version: pkgVersion });
        }
        return null;
      },

      /**
       * After Vite emits chunks + assets, find the single CSS asset (cssCodeSplit:false
       * guarantees there is at most one), substitute its contents into the JS chunk
       * at CSS_PLACEHOLDER, and drop the standalone CSS asset from the bundle.
       */
      generateBundle(_options, bundle) {
        let cssText = '';
        let cssAssetName: string | null = null;
        for (const [fname, item] of Object.entries(bundle)) {
          if (item.type === 'asset' && fname.endsWith('.css')) {
            const source = item.source;
            cssText = typeof source === 'string' ? source : Buffer.from(source).toString('utf8');
            cssAssetName = fname;
            break;
          }
        }
        for (const item of Object.values(bundle)) {
          if (item.type === 'chunk') {
            item.code = item.code.replace(JSON.stringify(CSS_PLACEHOLDER), JSON.stringify(cssText));
          }
        }
        if (cssAssetName) delete bundle[cssAssetName];
      },
    };
  }
  ```

- [ ] **Step 6.3.4:** Create `packages/vite-plugin-widget/src/index.ts`:

  ```ts
  export { perimeterWidget, type PerimeterWidgetPluginOptions } from './plugin';
  ```

- [ ] **Step 6.3.5:** Re-run plugin tests:

  Run: `pnpm --filter @perimeter/vite-plugin-widget test`
  Expected: PASS — both assertions green. (Note: the test runs an actual Vite build, may take 5-15 seconds.)

### Task 6.4: Quality + commit

- [ ] **Step 6.4.1:** Lint + typecheck + test:

  Run: `pnpm --filter @perimeter/vite-plugin-widget lint && pnpm --filter @perimeter/vite-plugin-widget typecheck && pnpm --filter @perimeter/vite-plugin-widget test`
  Expected: exits 0.

- [ ] **Step 6.4.2:** Repo-wide quality:

  Run: `pnpm quality`
  Expected: exits 0.

- [ ] **Step 6.4.3:** Commit:

  ```bash
  git add packages/vite-plugin-widget pnpm-lock.yaml
  git commit -m "feat(vite-plugin-widget): add IIFE codegen for widget packages

  The plugin emits a virtual entry that imports the widget definition
  plus the widget's CSS (via Vite ?inline on a virtual CSS module),
  then calls registerCss, ensureGlobal, and autoMount. Vite is
  configured for IIFE library mode with single-file CSS and React
  bundled in.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

### Chunk 6 acceptance

- The plugin builds a fixture widget into a single IIFE that includes the package version.
- `pnpm quality` exits 0.

---

## Chunk 7: `widgets/example`

**Outcome:** A minimal widget that exercises the platform end-to-end. Two `data-*` config attrs (`data-greeting`, `data-count`), no API call, no auth. Renders `data-count` cards with `data-greeting` as title. Builds to a single IIFE in `dist/example/example.iife.js`, under the 120 KB gzipped budget enforced by a small post-build test.

### Task 7.1: Scaffold

**Files:**
- Create: `widgets/example/package.json`
- Create: `widgets/example/tsconfig.json`
- Create: `widgets/example/vite.config.ts`
- Create: `widgets/example/vitest.config.ts`

- [ ] **Step 7.1.1:** Create `widgets/example/package.json`:

  ```json
  {
    "name": "@perimeter/widget-example",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "scripts": {
      "dev": "vite build --watch",
      "build": "vite build",
      "lint": "eslint src tests",
      "typecheck": "tsc --noEmit",
      "test": "vitest run"
    },
    "dependencies": {
      "@perimeter/theme": "workspace:*",
      "@perimeter/ui": "workspace:*",
      "@perimeter/widget-runtime": "workspace:*",
      "react": "^19.0.0",
      "react-dom": "^19.0.0",
      "zod": "^3.24.1"
    },
    "devDependencies": {
      "@perimeter/vite-plugin-widget": "workspace:*",
      "@testing-library/jest-dom": "^6.6.3",
      "@testing-library/react": "^16.1.0",
      "@types/react": "^19.0.7",
      "@types/react-dom": "^19.0.3",
      "@vitest/coverage-v8": "^2.1.8",
      "autoprefixer": "^10.4.20",
      "jsdom": "^25.0.1",
      "postcss": "^8.5.1",
      "tailwindcss": "^3.4.17",
      "typescript": "^5.7.3",
      "vite": "^6.0.7",
      "vitest": "^2.1.8"
    }
  }
  ```

- [ ] **Step 7.1.2:** Create `widgets/example/tsconfig.json`:

  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": { "rootDir": ".", "noEmit": true },
    "include": ["src/**/*", "tests/**/*"]
  }
  ```

- [ ] **Step 7.1.3:** Create `widgets/example/vite.config.ts`. The plugin's `name` MUST match the value the widget passes to `defineWidget({ name })`.

  ```ts
  import { defineConfig } from 'vite';
  import { perimeterWidget } from '@perimeter/vite-plugin-widget';

  export default defineConfig({
    plugins: [perimeterWidget({ name: 'example' })],
    build: { outDir: '../../dist/example' },
  });
  ```

- [ ] **Step 7.1.4:** Create `widgets/example/vitest.config.ts`:

  ```ts
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.{ts,tsx}'],
      setupFiles: ['./tests/setup.ts'],
    },
  });
  ```

- [ ] **Step 7.1.5:** Create `widgets/example/tests/setup.ts`:

  ```ts
  import '@testing-library/jest-dom/vitest';
  ```

- [ ] **Step 7.1.6:** Set up Tailwind for this widget. Create `widgets/example/tailwind.config.ts`:

  ```ts
  import type { Config } from 'tailwindcss';
  import preset from '@perimeter/theme/tailwind';

  const config: Config = {
    presets: [preset],
    content: ['./src/**/*.{ts,tsx}'],
  };
  export default config;
  ```

  Create `widgets/example/postcss.config.js`:

  ```js
  export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
  ```

  Create `widgets/example/src/styles.css`:

  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```

- [ ] **Step 7.1.7:** Run: `pnpm install`. Lockfile updates.

### Task 7.2: App + entry — test then implementation

**Files:**
- Create: `widgets/example/tests/app.test.tsx`
- Create: `widgets/example/src/app.tsx`
- Create: `widgets/example/src/index.ts`

- [ ] **Step 7.2.1:** Write `widgets/example/tests/app.test.tsx`:

  ```tsx
  import { describe, it, expect } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import { App } from '../src/app';

  describe('Example widget App', () => {
    it('renders one card per count with the greeting as title', () => {
      render(<App config={{ greeting: 'Hi', count: 3 }} />);
      const titles = screen.getAllByRole('heading', { level: 3 });
      expect(titles).toHaveLength(3);
      for (const t of titles) expect(t.textContent).toBe('Hi');
    });

    it('renders zero cards when count is 0', () => {
      render(<App config={{ greeting: 'Hi', count: 0 }} />);
      expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
    });
  });
  ```

- [ ] **Step 7.2.2:** Confirm failure: `pnpm --filter @perimeter/widget-example test`. Expected: FAIL.

- [ ] **Step 7.2.3:** Create `widgets/example/src/app.tsx`:

  ```tsx
  import * as React from 'react';
  import { Card, CardHeader, CardTitle, CardContent } from '@perimeter/ui/card';

  export interface AppProps {
    config: { greeting: string; count: number };
  }

  export function App({ config }: AppProps): React.JSX.Element {
    return (
      <div className="grid gap-3 p-4">
        {Array.from({ length: config.count }, (_, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>{config.greeting}</CardTitle>
            </CardHeader>
            <CardContent>Card #{i + 1}</CardContent>
          </Card>
        ))}
      </div>
    );
  }
  ```

- [ ] **Step 7.2.4:** Create `widgets/example/src/index.ts`:

  ```ts
  import { defineWidget } from '@perimeter/widget-runtime';
  import { z } from 'zod';
  import './styles.css';
  import { App } from './app';

  export default defineWidget({
    name: 'example',
    auth: 'none',
    schema: z.object({
      greeting: z.string().default('Hello'),
      count:    z.coerce.number().int().min(0).max(20).default(3),
    }),
    App: ({ config }) => <App config={config} />,
  });
  ```

- [ ] **Step 7.2.5:** Re-run app test: `pnpm --filter @perimeter/widget-example test`. Expected: PASS.

### Task 7.3: Build verification + size budget — test then build

**Files:**
- Create: `widgets/example/tests/bundle.test.ts`

- [ ] **Step 7.3.1:** Build the widget:

  Run: `pnpm --filter @perimeter/widget-example build`
  Expected: `dist/example/example.iife.js` exists. No errors.

- [ ] **Step 7.3.2:** Write `widgets/example/tests/bundle.test.ts`:

  ```ts
  import { describe, it, expect } from 'vitest';
  import { readFile } from 'node:fs/promises';
  import { gzipSync } from 'node:zlib';
  import path from 'node:path';

  const BUNDLE = path.resolve(__dirname, '../../../dist/example/example.iife.js');
  const BUDGET_BYTES = 120 * 1024;

  describe('example bundle', () => {
    it('is under the 120 KB gzipped budget', async () => {
      const raw = await readFile(BUNDLE);
      const gz = gzipSync(raw);
      expect(gz.byteLength).toBeLessThanOrEqual(BUDGET_BYTES);
    });

    it('contains the package version', async () => {
      const text = await readFile(BUNDLE, 'utf8');
      expect(text).toContain('0.0.0');
    });

    it('contains the autoMount call', async () => {
      const text = await readFile(BUNDLE, 'utf8');
      expect(text).toContain('autoMount');
    });
  });
  ```

- [ ] **Step 7.3.3:** Run the bundle test:

  Run: `pnpm --filter @perimeter/widget-example test`
  Expected: PASS. If the bundle exceeds 120 KB gzipped, fail loudly — Phase 1 must stay within budget.

### Task 7.4: Quality + commit

- [ ] **Step 7.4.1:** Lint, typecheck, test:

  Run: `pnpm --filter @perimeter/widget-example lint && pnpm --filter @perimeter/widget-example typecheck && pnpm --filter @perimeter/widget-example test`
  Expected: exits 0.

- [ ] **Step 7.4.2:** Repo-wide:

  Run: `pnpm quality`
  Expected: exits 0.

- [ ] **Step 7.4.3:** Commit:

  ```bash
  git add widgets/example pnpm-lock.yaml
  git commit -m "feat(widget-example): add example widget exercising the platform

  Two data-* attrs, no API, no auth. Renders count cards with greeting.
  Builds to dist/example/example.iife.js; bundle size test enforces the
  120 KB gzipped budget.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

### Chunk 7 acceptance

- `widgets/example` builds to a single IIFE file at `dist/example/example.iife.js`.
- The bundle is under the 120 KB gzipped budget.
- The widget mounts via `data-perimeter-widget="example"` and renders cards.
- `pnpm quality` exits 0.

---

## Chunk 8: `apps/studio`

**Outcome:** A Next.js app that lists components and widgets, renders previews of both, includes a token editor that updates previews live, and a placeholder admin route. The widget preview supports Native and As-shipped modes and propagates Studio token edits to as-shipped instances via `window.PerimeterWidgets.applyOverrides`. Tests cover the preview component and late-mount + DOM-equality acceptance criteria.

### Task 8.1: Scaffold

**Files:**
- Create: `apps/studio/package.json`
- Create: `apps/studio/tsconfig.json`
- Create: `apps/studio/next.config.ts`
- Create: `apps/studio/tailwind.config.ts`
- Create: `apps/studio/postcss.config.js`
- Create: `apps/studio/vitest.config.ts`
- Create: `apps/studio/src/styles/globals.css`

- [ ] **Step 8.1.1:** Create `apps/studio/package.json`:

  ```json
  {
    "name": "@perimeter/studio",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "scripts": {
      "dev": "next dev -p 3000",
      "build": "next build",
      "start": "next start -p 3000",
      "lint": "eslint src tests",
      "typecheck": "tsc --noEmit",
      "test": "vitest run"
    },
    "dependencies": {
      "@perimeter/theme": "workspace:*",
      "@perimeter/ui": "workspace:*",
      "@perimeter/widget-runtime": "workspace:*",
      "@perimeter/widget-example": "workspace:*",
      "next": "^16.0.0",
      "react": "^19.0.0",
      "react-dom": "^19.0.0"
    },
    "devDependencies": {
      "@testing-library/jest-dom": "^6.6.3",
      "@testing-library/react": "^16.1.0",
      "@types/node": "^22.10.5",
      "@types/react": "^19.0.7",
      "@types/react-dom": "^19.0.3",
      "@vitest/coverage-v8": "^2.1.8",
      "autoprefixer": "^10.4.20",
      "jsdom": "^25.0.1",
      "postcss": "^8.5.1",
      "tailwindcss": "^3.4.17",
      "typescript": "^5.7.3",
      "vitest": "^2.1.8"
    }
  }
  ```

- [ ] **Step 8.1.2:** Create `apps/studio/tsconfig.json`:

  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "rootDir": ".",
      "noEmit": true,
      "jsx": "preserve",
      "plugins": [{ "name": "next" }],
      "paths": { "@/*": ["./src/*"] }
    },
    "include": ["src/**/*", "tests/**/*", "next-env.d.ts"]
  }
  ```

- [ ] **Step 8.1.3:** Create `apps/studio/next.config.ts`. The rewrites map `/widget-bundles/<name>.js` to an internal API route that streams the file from the monorepo `dist/`. `__dirname` is undefined under ESM, so resolve the package directory via `import.meta.dirname` (Node 22+ provides it on every module).

  ```ts
  import type { NextConfig } from 'next';
  import path from 'node:path';

  const here = import.meta.dirname; // apps/studio
  const distRoot = path.resolve(here, '../../dist');

  const config: NextConfig = {
    async rewrites() {
      return [
        { source: '/widget-bundles/:name.js', destination: '/api/widget-bundles/:name' },
      ];
    },
    env: { WIDGET_DIST_ROOT: distRoot },
  };

  export default config;
  ```

  The rewrite goes to a route handler in Step 8.5; that handler streams the file directly from `dist/`.

- [ ] **Step 8.1.4:** Create `apps/studio/tailwind.config.ts`:

  ```ts
  import type { Config } from 'tailwindcss';
  import preset from '@perimeter/theme/tailwind';

  const config: Config = {
    presets: [preset],
    content: ['./src/**/*.{ts,tsx}'],
  };
  export default config;
  ```

- [ ] **Step 8.1.5:** Create `apps/studio/postcss.config.js`:

  ```js
  export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
  ```

- [ ] **Step 8.1.6:** Create `apps/studio/src/styles/globals.css`. Inline the token CSS variables on `:root` so Studio's own UI (outside any widget shadow root) also uses the tokens:

  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  :root {
    --color-bg:            hsl(0 0% 100%);
    --color-fg:            hsl(222 47% 11%);
    --color-muted:         hsl(210 40% 96%);
    --color-muted-fg:      hsl(215 16% 47%);
    --color-primary:       hsl(221 83% 53%);
    --color-primary-fg:    hsl(210 40% 98%);
    --color-secondary:     hsl(210 40% 96%);
    --color-secondary-fg:  hsl(222 47% 11%);
    --color-accent:        hsl(262 83% 58%);
    --color-accent-fg:     hsl(210 40% 98%);
    --color-destructive:   hsl(0 84% 60%);
    --color-destructive-fg:hsl(210 40% 98%);
    --color-border:        hsl(214 32% 91%);
    --color-ring:          hsl(221 83% 53%);
    --radius-sm:           0.25rem;
    --radius-md:           0.5rem;
    --radius-lg:           0.75rem;
    --font-sans:           Inter, system-ui, -apple-system, sans-serif;
    --font-mono:           ui-monospace, SFMono-Regular, monospace;
  }

  body { background: var(--color-bg); color: var(--color-fg); font-family: var(--font-sans); }
  ```

- [ ] **Step 8.1.7:** Create `apps/studio/vitest.config.ts`:

  ```ts
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.{ts,tsx}'],
      setupFiles: ['./tests/setup.ts'],
    },
  });
  ```

- [ ] **Step 8.1.8:** Create `apps/studio/tests/setup.ts`:

  ```ts
  import '@testing-library/jest-dom/vitest';
  ```

- [ ] **Step 8.1.9:** Run: `pnpm install`.

### Task 8.2: Registries + theme overrides context

**Files:**
- Create: `apps/studio/src/lib/components-registry.ts`
- Create: `apps/studio/src/lib/widgets-registry.ts`
- Create: `apps/studio/src/lib/theme-overrides-context.tsx`

- [ ] **Step 8.2.1:** Create `apps/studio/src/lib/components-registry.ts`:

  ```ts
  export interface ComponentEntry {
    slug:        string;
    title:       string;
    importPath:  string;
  }
  export const componentEntries: ComponentEntry[] = [
    { slug: 'button',   title: 'Button',   importPath: '@perimeter/ui/button' },
    { slug: 'card',     title: 'Card',     importPath: '@perimeter/ui/card' },
    { slug: 'input',    title: 'Input',    importPath: '@perimeter/ui/input' },
    { slug: 'label',    title: 'Label',    importPath: '@perimeter/ui/label' },
    { slug: 'skeleton', title: 'Skeleton', importPath: '@perimeter/ui/skeleton' },
  ];
  ```

- [ ] **Step 8.2.2:** Create `apps/studio/src/lib/widgets-registry.ts`:

  ```ts
  import example from '@perimeter/widget-example';
  import type { WidgetDefinition } from '@perimeter/widget-runtime';

  export interface WidgetEntry {
    slug:       string;
    title:      string;
    definition: WidgetDefinition;
  }
  export const widgetEntries: WidgetEntry[] = [
    { slug: 'example', title: 'Example widget', definition: example },
  ];
  ```

- [ ] **Step 8.2.3:** Create `apps/studio/src/lib/theme-overrides-context.tsx`. The provider also writes the current override map into a `<style id="perimeter-theme-overrides">` element appended to `<head>` so the overridden CSS variables cascade into every component page (which use Tailwind classes like `bg-primary` that resolve through `var(--color-primary)` on `:root`). Widget previews subscribe via `useThemeOverrides()`; component previews inherit through CSS-variable cascade with no React subscription needed.

  ```tsx
  'use client';
  import * as React from 'react';
  import type { ThemeToken } from '@perimeter/theme';

  type Overrides = Partial<Record<ThemeToken, string>>;
  interface Ctx {
    overrides: Overrides;
    setOverride(token: ThemeToken, value: string): void;
    resetOverride(token: ThemeToken): void;
  }
  const ThemeOverridesContext = React.createContext<Ctx | null>(null);
  const STYLE_ID = 'perimeter-theme-overrides';

  function writeStyleTag(overrides: Overrides): void {
    if (typeof document === 'undefined') return;
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    const decls = Object.entries(overrides)
      .filter(([, v]) => Boolean(v))
      .map(([k, v]) => `  --${k}: ${v as string};`)
      .join('\n');
    el.textContent = decls ? `:root {\n${decls}\n}` : '';
  }

  export function ThemeOverridesProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
    const [overrides, setOverrides] = React.useState<Overrides>({});
    React.useEffect(() => { writeStyleTag(overrides); }, [overrides]);
    const value: Ctx = {
      overrides,
      setOverride(token, val) { setOverrides((o) => ({ ...o, [token]: val })); },
      resetOverride(token) {
        setOverrides((o) => {
          const { [token]: _, ...rest } = o;
          void _;
          return rest;
        });
      },
    };
    return <ThemeOverridesContext.Provider value={value}>{children}</ThemeOverridesContext.Provider>;
  }

  export function useThemeOverrides(): Ctx {
    const ctx = React.useContext(ThemeOverridesContext);
    if (!ctx) throw new Error('useThemeOverrides() must be used inside ThemeOverridesProvider');
    return ctx;
  }
  ```

### Task 8.3: App layout + landing

**Files:**
- Create: `apps/studio/src/app/layout.tsx`
- Create: `apps/studio/src/app/page.tsx`

- [ ] **Step 8.3.1:** Create `apps/studio/src/app/layout.tsx`:

  ```tsx
  import * as React from 'react';
  import '../styles/globals.css';
  import { ThemeOverridesProvider } from '../lib/theme-overrides-context';

  export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
    return (
      <html lang="en">
        <body>
          <ThemeOverridesProvider>{children}</ThemeOverridesProvider>
        </body>
      </html>
    );
  }
  ```

- [ ] **Step 8.3.2:** Create `apps/studio/src/app/page.tsx`:

  ```tsx
  import Link from 'next/link';

  export default function Page(): React.JSX.Element {
    return (
      <main className="mx-auto max-w-3xl p-8 space-y-6">
        <h1 className="text-2xl font-semibold">Perimeter Widgets Studio</h1>
        <ul className="list-disc pl-6 space-y-2">
          <li><Link href="/components" className="text-primary underline">Components</Link></li>
          <li><Link href="/widgets" className="text-primary underline">Widgets</Link></li>
          <li><Link href="/theme" className="text-primary underline">Theme editor</Link></li>
          <li><Link href="/admin" className="text-muted-fg">Admin (Phase 3)</Link></li>
        </ul>
      </main>
    );
  }
  ```

### Task 8.4: Component preview routes

**Files:**
- Create: `apps/studio/src/app/components/page.tsx`
- Create: `apps/studio/src/app/components/[slug]/page.tsx`
- Create: `apps/studio/src/app/components/[slug]/previews.tsx`

- [ ] **Step 8.4.1:** Create `apps/studio/src/app/components/page.tsx`:

  ```tsx
  import Link from 'next/link';
  import { componentEntries } from '@/lib/components-registry';

  export default function ComponentsIndex(): React.JSX.Element {
    return (
      <main className="mx-auto max-w-3xl p-8 space-y-4">
        <h1 className="text-xl font-semibold">Components</h1>
        <ul className="space-y-1">
          {componentEntries.map((c) => (
            <li key={c.slug}>
              <Link href={`/components/${c.slug}`} className="text-primary underline">{c.title}</Link>
            </li>
          ))}
        </ul>
      </main>
    );
  }
  ```

- [ ] **Step 8.4.2:** Create `apps/studio/src/app/components/[slug]/previews.tsx`. One small component per slug with prop controls. Each preview imports the real component file directly — same module Studio's design system serves.

  ```tsx
  'use client';
  import * as React from 'react';
  import { Button } from '@perimeter/ui/button';
  import { Card, CardHeader, CardTitle, CardContent } from '@perimeter/ui/card';
  import { Input } from '@perimeter/ui/input';
  import { Label } from '@perimeter/ui/label';
  import { Skeleton } from '@perimeter/ui/skeleton';

  export function ButtonPreview(): React.JSX.Element {
    const [variant, setVariant] = React.useState<'primary' | 'secondary' | 'ghost'>('primary');
    const [size, setSize] = React.useState<'sm' | 'md' | 'lg'>('md');
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <label>Variant <select value={variant} onChange={(e) => setVariant(e.target.value as never)}>
            <option>primary</option><option>secondary</option><option>ghost</option>
          </select></label>
          <label>Size <select value={size} onChange={(e) => setSize(e.target.value as never)}>
            <option>sm</option><option>md</option><option>lg</option>
          </select></label>
        </div>
        <Button variant={variant} size={size}>Example button</Button>
      </div>
    );
  }

  export function CardPreview(): React.JSX.Element {
    return (
      <Card>
        <CardHeader><CardTitle>Card title</CardTitle></CardHeader>
        <CardContent>Card body content goes here.</CardContent>
      </Card>
    );
  }

  export function InputPreview(): React.JSX.Element {
    const [v, setV] = React.useState('');
    return (
      <div className="space-y-2">
        <Label htmlFor="i">Name</Label>
        <Input id="i" value={v} onChange={(e) => setV(e.target.value)} placeholder="Type here" />
      </div>
    );
  }

  export function LabelPreview(): React.JSX.Element {
    return <Label htmlFor="x">Example label</Label>;
  }

  export function SkeletonPreview(): React.JSX.Element {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  export const previews: Record<string, React.ComponentType> = {
    button: ButtonPreview,
    card: CardPreview,
    input: InputPreview,
    label: LabelPreview,
    skeleton: SkeletonPreview,
  };
  ```

- [ ] **Step 8.4.3:** Create `apps/studio/src/app/components/[slug]/page.tsx`. Next.js 16 types `params` as a `Promise` in dynamic routes — must be awaited in async server components.

  ```tsx
  import * as React from 'react';
  import { notFound } from 'next/navigation';
  import { componentEntries } from '@/lib/components-registry';
  import { previews } from './previews';

  export function generateStaticParams(): { slug: string }[] {
    return componentEntries.map((c) => ({ slug: c.slug }));
  }

  export default async function ComponentPage({
    params,
  }: {
    params: Promise<{ slug: string }>;
  }): Promise<React.JSX.Element> {
    const { slug } = await params;
    const entry = componentEntries.find((c) => c.slug === slug);
    const Preview = previews[slug];
    if (!entry || !Preview) notFound();
    return (
      <main className="mx-auto max-w-3xl p-8 space-y-6">
        <h1 className="text-xl font-semibold">{entry.title}</h1>
        <code className="text-sm text-muted-fg">{entry.importPath}</code>
        <div className="rounded-md border border-border p-6 bg-bg">
          <Preview />
        </div>
      </main>
    );
  }
  ```

### Task 8.5: Widget bundles route + as-shipped renderer + native renderer

**Files:**
- Create: `apps/studio/src/app/api/widget-bundles/[name]/route.ts`
- Create: `apps/studio/src/lib/widget-preview/native-renderer.tsx`
- Create: `apps/studio/src/lib/widget-preview/as-shipped-renderer.tsx`
- Create: `apps/studio/src/lib/widget-preview/widget-preview.tsx`

- [ ] **Step 8.5.1:** Create the route handler at `apps/studio/src/app/api/widget-bundles/[name]/route.ts`. Reads from the monorepo `dist/` directory.

  ```ts
  import { readFile } from 'node:fs/promises';
  import path from 'node:path';
  import { NextResponse } from 'next/server';

  export async function GET(
    _req: Request,
    ctx: { params: Promise<{ name: string }> },
  ): Promise<NextResponse> {
    const { name } = await ctx.params;
    const distRoot = process.env['WIDGET_DIST_ROOT'];
    if (!distRoot) return new NextResponse('no dist root', { status: 500 });
    const filePath = path.join(distRoot, name, `${name}.iife.js`);
    try {
      const buf = await readFile(filePath);
      return new NextResponse(buf, {
        headers: {
          'content-type': 'application/javascript; charset=utf-8',
          'cache-control': 'no-store',
        },
      });
    } catch {
      return new NextResponse('not found', { status: 404 });
    }
  }
  ```

- [ ] **Step 8.5.2:** Create `apps/studio/src/lib/widget-preview/native-renderer.tsx`. Uses `useMemo` to derive stable string keys from the config/dataThemeAttrs objects so React's exhaustive-deps lint does not warn.

  ```tsx
  'use client';
  import * as React from 'react';
  import type { WidgetDefinition } from '@perimeter/widget-runtime';
  import { nativeRender, registerCss } from '@perimeter/widget-runtime';
  import { useThemeOverrides } from '../theme-overrides-context';

  export interface NativeRendererProps {
    definition:      WidgetDefinition;
    config:          Record<string, string>;
    dataThemeAttrs:  Record<string, string>;
  }

  export function NativeRenderer({ definition, config, dataThemeAttrs }: NativeRendererProps): React.JSX.Element {
    const host = React.useRef<HTMLDivElement | null>(null);
    const target = React.useRef<HTMLDivElement | null>(null);
    const mounted = React.useRef<ReturnType<typeof nativeRender> | null>(null);
    const { overrides } = useThemeOverrides();
    const configKey = React.useMemo(() => JSON.stringify(config), [config]);
    const themeKey = React.useMemo(() => JSON.stringify(dataThemeAttrs), [dataThemeAttrs]);

    React.useEffect(() => {
      // Native mode: no IIFE involved, so register an empty CSS string for this widget
      // (Tailwind classes resolve via :root vars).
      registerCss(definition.name, '');
    }, [definition.name]);

    React.useEffect(() => {
      const t = target.current;
      const h = host.current;
      if (!t || !h) return;
      for (const [k, v] of Object.entries(dataThemeAttrs)) t.setAttribute(k, v);
      for (const [k, v] of Object.entries(config)) t.setAttribute(`data-${k}`, v);
      mounted.current = nativeRender({
        definition,
        target: t,
        hostRoot: h,
        authFactory: () => ({
          getToken: () => null,
          isAuthenticated: () => false,
          onChange: () => () => {},
        }),
      });
      return () => {
        mounted.current?.unmount();
        mounted.current = null;
      };
    }, [definition, configKey, themeKey]);
    // configKey/themeKey are memoized scalars derived from config/dataThemeAttrs above.

    React.useEffect(() => {
      mounted.current?.updateTokens(overrides as Record<string, string>);
    }, [overrides]);

    return (
      <div ref={host}>
        <div ref={target} />
      </div>
    );
  }
  ```

- [ ] **Step 8.5.3:** Create `apps/studio/src/lib/widget-preview/as-shipped-renderer.tsx`. Computes a config/data-attr key once via `useMemo` so the effect deps stay stable (avoids the `JSON.stringify` in deps anti-pattern). Cleanup removes the script tag and the shadow root.

  ```tsx
  'use client';
  import * as React from 'react';
  import type { WidgetDefinition } from '@perimeter/widget-runtime';
  import { useThemeOverrides } from '../theme-overrides-context';

  export interface AsShippedRendererProps {
    definition:     WidgetDefinition;
    config:         Record<string, string>;
    dataThemeAttrs: Record<string, string>;
  }

  declare global {
    interface Window {
      PerimeterWidgets?: {
        [name: string]: unknown;
        applyOverrides(name: string, overrides: Record<string, string>): void;
        mount(name: string, target: HTMLElement, configOverrides?: Record<string, unknown>): { unmount(): void };
      };
    }
  }

  export function AsShippedRenderer({ definition, config, dataThemeAttrs }: AsShippedRendererProps): React.JSX.Element {
    const target = React.useRef<HTMLDivElement | null>(null);
    const scriptId = `perimeter-widget-${definition.name}-script`;
    const cacheBustRef = React.useRef(0);
    const { overrides } = useThemeOverrides();
    const configKey = React.useMemo(() => JSON.stringify(config), [config]);
    const themeKey = React.useMemo(() => JSON.stringify(dataThemeAttrs), [dataThemeAttrs]);

    React.useEffect(() => {
      cacheBustRef.current += 1;
      const t = target.current;
      if (!t) return;

      // The runtime's autoMount sets a `__perimeterMounted` marker on the target;
      // we clear it so a fresh remount runs.
      delete (t as HTMLElement & { __perimeterMounted?: boolean }).__perimeterMounted;
      // Clear any prior shadow root content from a previous remount.
      if (t.shadowRoot) while (t.shadowRoot.firstChild) t.shadowRoot.removeChild(t.shadowRoot.firstChild);

      // Write attrs the bundle reads.
      t.setAttribute('data-perimeter-widget', definition.name);
      for (const [k, v] of Object.entries(dataThemeAttrs)) t.setAttribute(k, v);
      for (const [k, v] of Object.entries(config)) t.setAttribute(`data-${k}`, v);

      // (Re)load script.
      document.getElementById(scriptId)?.remove();
      const s = document.createElement('script');
      s.id = scriptId;
      s.src = `/widget-bundles/${definition.name}.js?v=${cacheBustRef.current}`;
      document.body.appendChild(s);

      return () => {
        document.getElementById(scriptId)?.remove();
        if (t.shadowRoot) while (t.shadowRoot.firstChild) t.shadowRoot.removeChild(t.shadowRoot.firstChild);
        t.removeAttribute('data-perimeter-widget');
      };
    }, [definition.name, configKey, themeKey, scriptId]);
    // configKey/themeKey are derived from config/dataThemeAttrs and are stable per shape — see useMemo above.

    React.useEffect(() => {
      window.PerimeterWidgets?.applyOverrides(definition.name, overrides as Record<string, string>);
    }, [definition.name, overrides]);

    return <div ref={target} />;
  }
  ```

- [ ] **Step 8.5.4:** Create `apps/studio/src/lib/widget-preview/widget-preview.tsx`. The component that owns the mode toggle.

  ```tsx
  'use client';
  import * as React from 'react';
  import type { WidgetDefinition } from '@perimeter/widget-runtime';
  import { NativeRenderer } from './native-renderer';
  import { AsShippedRenderer } from './as-shipped-renderer';

  export interface WidgetPreviewProps {
    definition: WidgetDefinition;
  }

  export function WidgetPreview({ definition }: WidgetPreviewProps): React.JSX.Element {
    const [mode, setMode] = React.useState<'native' | 'as-shipped'>('native');
    const [config, setConfig] = React.useState<Record<string, string>>({ greeting: 'Hello', count: '3' });
    const [dataThemeAttrs, setDataThemeAttrs] = React.useState<Record<string, string>>({});

    return (
      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="rounded-md border border-border p-6 bg-bg">
          {mode === 'native' ? (
            <NativeRenderer definition={definition} config={config} dataThemeAttrs={dataThemeAttrs} />
          ) : (
            <AsShippedRenderer definition={definition} config={config} dataThemeAttrs={dataThemeAttrs} />
          )}
        </div>
        <div className="space-y-4">
          <div>
            <span className="text-sm font-medium">Render mode</span>
            <div className="flex gap-2 mt-1">
              <button onClick={() => setMode('native')} className={mode === 'native' ? 'underline' : ''}>Native</button>
              <button onClick={() => setMode('as-shipped')} className={mode === 'as-shipped' ? 'underline' : ''}>As shipped</button>
            </div>
          </div>
          <div>
            <span className="text-sm font-medium">Config (data-*)</span>
            {Object.entries(config).map(([k, v]) => (
              <div key={k} className="flex gap-2 mt-1">
                <code className="text-xs">data-{k}</code>
                <input value={v} onChange={(e) => setConfig({ ...config, [k]: e.target.value })} className="border px-1 text-xs" />
              </div>
            ))}
          </div>
          <div>
            <span className="text-sm font-medium">Theme override</span>
            <div className="flex gap-2 mt-1">
              <code className="text-xs">data-theme-color-primary</code>
              <input
                placeholder="hsl(...)"
                onChange={(e) =>
                  setDataThemeAttrs({ ...dataThemeAttrs, 'data-theme-color-primary': e.target.value })
                }
                className="border px-1 text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
  ```

### Task 8.6: Widget preview routes

**Files:**
- Create: `apps/studio/src/app/widgets/page.tsx`
- Create: `apps/studio/src/app/widgets/[slug]/page.tsx`

- [ ] **Step 8.6.1:** Create `apps/studio/src/app/widgets/page.tsx`:

  ```tsx
  import Link from 'next/link';
  import { widgetEntries } from '@/lib/widgets-registry';

  export default function WidgetsIndex(): React.JSX.Element {
    return (
      <main className="mx-auto max-w-3xl p-8 space-y-4">
        <h1 className="text-xl font-semibold">Widgets</h1>
        <ul className="space-y-1">
          {widgetEntries.map((w) => (
            <li key={w.slug}><Link href={`/widgets/${w.slug}`} className="text-primary underline">{w.title}</Link></li>
          ))}
        </ul>
      </main>
    );
  }
  ```

- [ ] **Step 8.6.2:** Create `apps/studio/src/app/widgets/[slug]/page.tsx`:

  ```tsx
  import * as React from 'react';
  import { notFound } from 'next/navigation';
  import { widgetEntries } from '@/lib/widgets-registry';
  import { WidgetPreview } from '@/lib/widget-preview/widget-preview';

  export function generateStaticParams(): { slug: string }[] {
    return widgetEntries.map((w) => ({ slug: w.slug }));
  }

  export default async function WidgetPage({
    params,
  }: {
    params: Promise<{ slug: string }>;
  }): Promise<React.JSX.Element> {
    const { slug } = await params;
    const entry = widgetEntries.find((w) => w.slug === slug);
    if (!entry) notFound();
    return (
      <main className="mx-auto max-w-5xl p-8 space-y-6">
        <h1 className="text-xl font-semibold">{entry.title}</h1>
        <WidgetPreview definition={entry.definition} />
      </main>
    );
  }
  ```

### Task 8.7: Theme editor route

**Files:**
- Create: `apps/studio/src/app/theme/page.tsx`

- [ ] **Step 8.7.1:** Create `apps/studio/src/app/theme/page.tsx`:

  ```tsx
  'use client';
  import * as React from 'react';
  import { globalTokens, type ThemeToken } from '@perimeter/theme';
  import { useThemeOverrides } from '@/lib/theme-overrides-context';

  export default function ThemePage(): React.JSX.Element {
    const { overrides, setOverride, resetOverride } = useThemeOverrides();
    return (
      <main className="mx-auto max-w-3xl p-8 space-y-4">
        <h1 className="text-xl font-semibold">Theme editor</h1>
        <p className="text-sm text-muted-fg">Edits apply live to every preview on the site.</p>
        <table className="w-full text-sm">
          <thead><tr><th className="text-left">Token</th><th className="text-left">Default</th><th className="text-left">Override</th></tr></thead>
          <tbody>
            {(Object.keys(globalTokens) as ThemeToken[]).map((t) => (
              <tr key={t} className="border-t">
                <td className="py-1 pr-4 font-mono">{t}</td>
                <td className="py-1 pr-4 font-mono">{globalTokens[t]}</td>
                <td className="py-1 pr-4 flex gap-2 items-center">
                  <input
                    value={overrides[t] ?? ''}
                    onChange={(e) => setOverride(t, e.target.value)}
                    placeholder="(default)"
                    className="border px-1 w-64 text-xs"
                  />
                  {overrides[t] && (
                    <button onClick={() => resetOverride(t)} className="text-xs underline">reset</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    );
  }
  ```

### Task 8.8: Admin placeholder

**Files:**
- Create: `apps/studio/src/app/admin/page.tsx`

- [ ] **Step 8.8.1:** Create `apps/studio/src/app/admin/page.tsx`:

  ```tsx
  export default function AdminPage(): React.JSX.Element {
    return (
      <main className="mx-auto max-w-3xl p-8 space-y-4">
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="text-sm text-muted-fg">Releases, promotion, rollback — landing in Phase 3.</p>
      </main>
    );
  }
  ```

### Task 8.9: Acceptance tests — DOM equality + late mount

**Files:**
- Create: `apps/studio/tests/widget-preview.test.tsx`

- [ ] **Step 8.9.1:** Write `apps/studio/tests/widget-preview.test.tsx`. The DOM-equality test loads the *actually-built* IIFE bundle and compares its shadow-root output to a direct `mountWidget` of the same widget definition — exercising native and as-shipped together. The late-mount test inserts a `data-perimeter-widget` div after `autoMount` runs. Requires `widgets/example` to have been built once before this test runs (Chunk 9 step ensures this).

  ```tsx
  import * as React from 'react';
  import { describe, it, expect, beforeEach, vi } from 'vitest';
  import { render, act } from '@testing-library/react';
  import { readFileSync } from 'node:fs';
  import path from 'node:path';
  import example from '@perimeter/widget-example';
  import { autoMount, disposeAutoMount, mountWidget, clearAll, registerCss } from '@perimeter/widget-runtime';
  import { ThemeOverridesProvider } from '@/lib/theme-overrides-context';
  import { NativeRenderer } from '@/lib/widget-preview/native-renderer';

  const BUNDLE = path.resolve(__dirname, '../../../dist/example/example.iife.js');
  const noAuth = () => ({ getToken: () => null, isAuthenticated: () => false, onChange: () => () => {} });

  beforeEach(() => {
    clearAll();
    registerCss('example', '');
    document.body.innerHTML = '';
    disposeAutoMount();
    // Reset the global so each test starts clean.
    delete (window as unknown as { PerimeterWidgets?: unknown }).PerimeterWidgets;
  });

  describe('NativeRenderer', () => {
    it('mounts the example widget into a shadow root', async () => {
      const { container } = render(
        <ThemeOverridesProvider>
          <NativeRenderer definition={example} config={{ greeting: 'Hi', count: '2' }} dataThemeAttrs={{}} />
        </ThemeOverridesProvider>,
      );
      const targetDiv = container.querySelector('div > div') as HTMLElement;
      await vi.waitFor(() => {
        expect(targetDiv.shadowRoot?.querySelectorAll('h3').length).toBe(2);
      });
    });
  });

  describe('DOM equality: native vs as-shipped IIFE', () => {
    it('produces equivalent shadow-root HTML for identical config', async () => {
      // 1) Mount the same widget definition directly via the runtime — this is the path
      //    NativeRenderer uses. We compare its output to the IIFE path.
      const a = document.createElement('div');
      a.setAttribute('data-greeting', 'Hi');
      a.setAttribute('data-count', '2');
      document.body.appendChild(a);
      mountWidget({ definition: example, target: a, authFactory: noAuth });
      await vi.waitFor(() => expect(a.shadowRoot?.querySelector('h3')).not.toBeNull());
      const nativeHtml = a.shadowRoot!.innerHTML;

      // 2) Evaluate the built IIFE in this jsdom window, then mount against a fresh target.
      //    The IIFE's autoMount will pick the target up automatically.
      const b = document.createElement('div');
      b.setAttribute('data-perimeter-widget', 'example');
      b.setAttribute('data-greeting', 'Hi');
      b.setAttribute('data-count', '2');
      document.body.appendChild(b);
      const iifeSrc = readFileSync(BUNDLE, 'utf8');
      new Function(iifeSrc)();
      await vi.waitFor(() => expect(b.shadowRoot?.querySelector('h3')).not.toBeNull());
      const asShippedHtml = b.shadowRoot!.innerHTML;

      const norm = (html: string) =>
        html
          .replace(/\s+/g, ' ')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '<style/>') // tolerate CSS differences (Tailwind vs empty)
          .trim();
      expect(norm(asShippedHtml)).toBe(norm(nativeHtml));
    });
  });

  describe('Late mount via autoMount', () => {
    it('mounts a target added after autoMount runs', async () => {
      autoMount(example);
      const late = document.createElement('div');
      late.setAttribute('data-perimeter-widget', 'example');
      late.setAttribute('data-greeting', 'Late');
      late.setAttribute('data-count', '1');
      act(() => { document.body.appendChild(late); });
      await vi.waitFor(() => {
        expect(late.shadowRoot?.querySelector('h3')?.textContent).toBe('Late');
      });
    });
  });
  ```

  `new Function(iifeSrc)()` evaluates the built bundle. The project rule against `eslint-disable` comments stands; instead, the root ESLint config's test-files override (Chunk 1, Step 1.2.5) disables `no-implied-eval` in `**/tests/**` and `**/*.test.{ts,tsx}` — so this test compiles cleanly with no inline suppressions.

### Task 8.10: Quality + commit

- [ ] **Step 8.10.1:** Lint, typecheck, test:

  Run: `pnpm --filter @perimeter/studio lint && pnpm --filter @perimeter/studio typecheck && pnpm --filter @perimeter/studio test`
  Expected: exits 0.

- [ ] **Step 8.10.2:** Smoke test the dev server. Build the example widget first so the as-shipped renderer has a bundle:

  Run: `pnpm --filter @perimeter/widget-example build && pnpm --filter @perimeter/studio dev`
  Then in another terminal: `curl -sf http://localhost:3000/widget-bundles/example.js | head -c 100`
  Expected: returns the first 100 bytes of the IIFE bundle. Visit `/components/button`, `/widgets/example`, `/theme` in a browser to confirm they render. Stop the server with Ctrl-C.

- [ ] **Step 8.10.3:** Repo-wide quality:

  Run: `pnpm quality`
  Expected: exits 0.

- [ ] **Step 8.10.4:** Commit:

  ```bash
  git add apps/studio pnpm-lock.yaml
  git commit -m "feat(studio): add Studio app with components, widgets, theme editor

  Next.js app shells the dev experience: component previews with prop
  controls, widget preview with Native and As-shipped render modes,
  live theme editor that propagates to both modes (Native via React
  context + nativeRender.updateTokens; As-shipped via
  window.PerimeterWidgets.applyOverrides). Tests cover the renderer
  component, native/direct DOM equality, and MutationObserver-based
  late mounting.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

### Chunk 8 acceptance

- Studio dev server boots; `/components/button`, `/components/card`, etc. render.
- `/widgets/example` renders the widget in Native and As-shipped modes; toggle switches without errors.
- `/theme` lets you edit a token and the change reflects in both component and widget previews.
- DOM-equality test passes (native vs. direct `mountWidget`).
- Late-mount test passes.
- `pnpm quality` exits 0.

---

## Chunk 9: CI bundle-budget enforcement + final acceptance

**Outcome:** CI runs the bundle-budget test; all Phase 1 acceptance criteria from the spec are verified.

### Task 9.1: CI tweaks

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `apps/studio/package.json`

- [ ] **Step 9.1.1:** Update `.github/workflows/ci.yml`. Build runs before quality so both the `widgets/example` bundle-size test AND the Studio DOM-equality test (which loads the built IIFE) have the artifact present.

  ```yaml
  name: ci
  on:
    pull_request:
    push:
      branches: [dev, main]
  jobs:
    quality:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
          with: { version: 10.32.1 }
        - uses: actions/setup-node@v4
          with:
            node-version: 22
            cache: pnpm
        - run: pnpm install --frozen-lockfile
        - run: pnpm build
        - run: pnpm quality
  ```

- [ ] **Step 9.1.2:** Make Studio's `test` script depend on the example widget being built first by adding a `pretest` script to `apps/studio/package.json`:

  ```json
  {
    "scripts": {
      "pretest": "pnpm --filter @perimeter/widget-example build",
      "test": "vitest run"
    }
  }
  ```

  This guarantees local `pnpm --filter @perimeter/studio test` works on a fresh checkout where the example IIFE may not yet be built.

### Task 9.2: Final acceptance walk

- [ ] **Step 9.2.1:** From the repo root, perform every Phase 1 acceptance criterion in order:

  1. **Clean install + quality:**

     Run: `rm -rf node_modules && pnpm install && pnpm quality`
     Expected: exits 0.

  2. **Build produces the IIFE under budget:**

     Run: `pnpm --filter @perimeter/widget-example build && pnpm --filter @perimeter/widget-example test`
     Expected: exits 0. Bundle exists at `dist/example/example.iife.js`.

  3. **Studio dev server:**

     Run: `pnpm --filter @perimeter/studio dev` and visit:
     - `http://localhost:3000/` (landing)
     - `http://localhost:3000/components/button` (renders button with variants)
     - `http://localhost:3000/widgets/example` (renders example widget; toggle Native/As-shipped works)
     - `http://localhost:3000/theme` (editing `color-primary` updates the preview live)

     Verify each manually. Stop the server.

  4. **As-shipped picks up rebuilds:**

     Restart: `pnpm --filter @perimeter/widget-example dev` (watch). Edit `widgets/example/src/app.tsx` to change a string. Reload `/widgets/example` in As-shipped mode (re-mount button if added; otherwise reload). The change appears.

  5. **Late-mount + DOM-equality:**

     Already covered by the Studio test suite. Confirm:

     Run: `pnpm --filter @perimeter/studio test -- -t 'Late mount'`
     Expected: PASS.

     Run: `pnpm --filter @perimeter/studio test -- -t 'DOM equality'`
     Expected: PASS.

### Task 9.3: Commit the CI tweak and push

- [ ] **Step 9.3.1:** Commit and push:

  ```bash
  git add .github/workflows/ci.yml
  git commit -m "ci: build before quality so bundle-size test has the IIFE

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  git push -u origin HEAD
  ```

- [ ] **Step 9.3.2:** Open a PR targeting `dev` using the project's `--body-file` convention (see project CLAUDE.md). The PR body should summarize the Phase 1 deliverables and link to the spec.

### Chunk 9 acceptance

- CI passes on the PR.
- Manual acceptance walk completed.
- PR open against `dev`.

---

## Done.

Phase 1 is complete when Chunk 9 acceptance is met. The next phase (sermons port) has its own spec, written after this phase lands.

---
