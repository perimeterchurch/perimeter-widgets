# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Turborepo monorepo of self-contained React widgets for embedding on perimeter.org (WordPress). Each widget compiles to a single IIFE script, renders inside a shadow DOM for style isolation, and fetches data from `api.perimeter.org` (perimeter-api).

## Commands

| Command                              | Description                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| `pnpm dev`                           | Start the site (`apps/site`) and rebuild all widgets in watch mode — open `/widgets` |
| `pnpm build`                         | Build every package (registry, site, widgets) via Turborepo                          |
| `pnpm build --filter=widget-sermons` | Build a single widget                                                                |
| `pnpm test`                          | Run all tests via Turborepo                                                          |
| `pnpm test --filter=widget-sermons`  | Run tests for a single widget                                                        |
| `pnpm storybook`                     | Start Storybook v10 for shared components                                            |
| `pnpm lint`                          | Run ESLint across all packages                                                       |
| `pnpm typecheck`                     | TypeScript type checking                                                             |
| `pnpm quality`                       | Run all checks (typecheck + lint + format + test)                                    |

## Architecture

### Monorepo Packages

| Package                 | Name                               | Purpose                                                                  |
| ----------------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| `apps/site/`            | `@perimeter-widgets/site`          | Next.js showcase + widget preview + registry build (style.perimeter.org) |
| `packages/registry/`    | `@perimeter-widgets/registry`      | shadcn component source (56 components) + themes + build scripts         |
| `packages/shared/`      | `@perimeter-widgets/shared`        | API client, auth, shadow DOM mount, shared components, Tailwind preset   |
| `packages/vite-preset/` | `@perimeter-widgets/vite-preset`   | Shared Vite config factory for widgets + `vite-tsconfig-paths`           |
| `widgets/<name>/`       | `@perimeter-widgets/widget-<name>` | Individual widget packages (e.g. `widgets/sermons/`)                     |

### Widget Build Pipeline

Each widget is a Vite library mode build that produces a single IIFE JS file in `dist/<name>/<name>.js`. CSS is inlined into the JS via `?inline` imports for shadow DOM injection. React is bundled into each widget (WordPress doesn't provide it).

### Shadow DOM Mounting

Widgets mount via `mountWidget()` from `@perimeter-widgets/shared`:

1. Finds target `<div>` by element ID
2. Reads `data-*` attributes as config
3. Creates shadow root with injected styles (reuses existing on re-mount)
4. Renders React app with isolated QueryClient, auth, and config providers

### Auth

Reads MP OAuth token from `localStorage` (`mpp-widgets_AuthToken` / `mpp-widgets_ExpiresAfter`). Public widgets skip auth. Authenticated widgets attach token as `Authorization: Bearer <token>`.

### CDN Delivery

Built files in `dist/` are committed to the repo. Served via jsDelivr `@latest`. GitHub Action purges CDN cache on push to `main`.

### Site Deployment

`apps/site` deploys to `style.perimeter.org` via Vercel. The project's Root Directory is `apps/site`; Vercel auto-detects Next.js + pnpm workspaces and runs the site's `build` script, which chains registry build → copy-registry → sync-widget-bundles → collect-demos → sitemap → `next build`. Static export lands at `apps/site/out/` and serves at the root, so `/r/*.json`, `/widgets/[slug]`, `/components/*`, `/design/*`, `/templates/*`, `/docs/*`, and `/changelog` are all one deploy.

### Widget preview (`/widgets`)

The site at `apps/site/` hosts `/widgets` and `/widgets/[slug]` pages that preview each widget live. Previews load the same IIFE bundle (`dist/<widget>/<widget>.js`) that WordPress consumes via jsDelivr, so what you see on `style.perimeter.org/widgets/sermons` is byte-for-byte what you ship.

- **Production:** `pnpm --filter @perimeter-widgets/site build` copies `dist/<widget>/*.js` into `apps/site/public/widget-bundles/` → static export at `/widget-bundles/<widget>.js`.
- **Dev:** `pnpm dev` runs two things in parallel via Turborepo:
    - Each widget package's `dev` script is `vite build --watch` — rebuilds its IIFE on every source save.
    - `apps/site` starts Next.js with `next dev --webpack` after symlinking `apps/site/public/widget-bundles/` → monorepo-root `dist/`, so every widget rebuild is picked up immediately by the site's `<script>` loader (the config-editor bumps a cache-busting query on re-mount).
- The preview page has a live config editor for `data-*` attributes, a copy-pasteable embed snippet, and a re-mount button that tears down the widget's shadow DOM and reloads the bundle.
- Widget previews hit the real API. Configure via `NEXT_PUBLIC_API_URL` (defaults to `https://api.perimeter.org`).

## Environment Variables

Defined in `env.d.ts` at monorepo root. Convention: `VITE_<DOMAIN>_<NAME>`.

| Variable              | Default                                             | Description                                                            |
| --------------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| `VITE_API_URL`        | `localhost:5500` (dev) / `api.perimeter.org` (prod) | API base URL override for widgets                                      |
| `NEXT_PUBLIC_API_URL` | `https://api.perimeter.org`                         | API base URL for the site's widget preview config editor (client-side) |

Setup: `cp .env.example .env.local` or inline: `VITE_API_URL=localhost:5500 pnpm dev`

## Path Aliases

The storyboard uses `@/*` → `src/*` aliases (leaf package). Shared and widget packages use relative imports because they are consumed by other packages — path aliases in consumed packages break cross-package TypeScript resolution.

`vite-tsconfig-paths` syncs tsconfig paths to Vite automatically.

## Critical Rules

- **Always use `pnpm`** — never npm or npx
- **Read docs before code** — check `docs/` for architecture and guides before modifying the codebase
- **Never add eslint-disable comments** — fix the underlying code instead of suppressing warnings. eslint-disable comments hide problems and rot over time
- **Never use `any` in production code** — `@typescript-eslint/no-explicit-any` is enforced as an error. Use proper types, generics, or `unknown` instead. Test and story files are exempt from this rule

## Context Loading

**Always read the relevant doc BEFORE searching the codebase or writing code.**

| Working on...                                 | Load first                            |
| --------------------------------------------- | ------------------------------------- |
| Monorepo structure or build pipeline          | `docs/architecture/overview.md`       |
| Shared package (API, auth, mount, components) | `docs/architecture/shared-package.md` |
| Vite build config or test config              | `docs/architecture/vite-preset.md`    |
| CDN, jsDelivr, or deployment                  | `docs/architecture/cdn-deployment.md` |
| Sermons widget                                | `docs/widgets/sermons.md`             |
| Developer setup or environment                | `docs/guides/developer-setup.md`      |
| Git workflow or conventions                   | `docs/guides/developer-rules.md`      |
| Creating a new widget                         | `docs/guides/adding-a-widget.md`      |
| Auth, MP tokens, or security                  | `docs/guides/authentication.md`       |
| Writing or fixing tests                       | `docs/guides/testing.md`              |
| WordPress embed patterns                      | `docs/reference/embed-guide.md`       |
| Design tokens or colors                       | `docs/reference/design-tokens.md`     |
| Unknown area                                  | `docs/README.md` (full index)         |

## Adding a New Widget

1. Create `widgets/<name>/` with entry point, components, hooks, tests
2. Add 3-line `vite.config.ts` using `createWidgetConfig()` from `@perimeter-widgets/vite-preset`
3. Add 1-line `vitest.config.ts` using `createWidgetTestConfig()`
4. Add entry to `apps/site/src/lib/widgets-registry.ts` with metadata + config fields
5. `pnpm build --filter=widget-<name>` — output lands in `dist/<name>/`
6. `pnpm dev` → visit `http://localhost:3000/widgets/<name>` to live-preview it
7. Commit dist, push to main — GitHub Action purges jsDelivr
8. Add `<div>` + `<script>` tag on WordPress once — never touch it again

## Git Workflow

### Branch Model

- **`main`** — production. Updated only via batched release PR from `dev`. Never commit or push directly
- **`dev`** — integration branch. All feature work merges here via pull request. Never commit or push directly
- **Feature branches** — created off `dev`, merged back via PR targeting `dev`

### Branch Naming

Use conventional prefixes: `feat/`, `fix/`, `refactor/`, `chore/`, `docs/`, `test/` with kebab-case descriptions.

### Workflow

```
1. git checkout dev && git pull
2. git checkout -b feat/my-feature        # or use a worktree (see below)
3. ... make changes, commit atomically ...
4. pnpm quality                            # must pass before PR
5. git push -u origin feat/my-feature      # push the feature branch only
6. Write PR body to file, then: gh pr create --base dev --body-file <path>
7. Developer reviews and merges on GitHub
```

### Commit Discipline

- **Atomic commits** — each commit represents one logical change that compiles and passes tests
- **Conventional commit format:** `type: subject` — e.g., `feat: add sermon search endpoint`
- **Write commit bodies for non-obvious changes** — the subject says what, the body says why

### Pull Requests (Feature)

- **Always target `dev`** — never open a feature PR against `main`
- **Always use `--body-file` for PR commands** — write the PR body to a temp file with the **Write tool**, then pass it with `gh pr create --body-file <path>`. This prevents ANSI escape codes from leaking into PR descriptions
- **Run `pnpm quality` before opening** — the branch must pass typecheck + lint + format + test
- **The developer merges** — Claude creates the PR and pushes the branch; the developer reviews and merges on GitHub

### Releasing to Production (Batched Release PR)

When `dev` is stable and ready for production, the developer opens a single release PR from `dev` → `main`:

```
1. git checkout dev && git pull
2. Write release body to file, then: gh pr create --base main --head dev --title "Release: <summary>" --body-file <path>
3. Developer reviews the cumulative diff, approves, and merges on GitHub
```

- **One PR per release cycle** — batches all reviewed work from `dev`, not one PR per feature
- **No feature-level PRs to `main`** — all individual changes are already reviewed when they merge into `dev`
- **The developer decides when to release** — Claude never opens a release PR to `main` unless explicitly asked
- **Run `pnpm quality` on `dev` before releasing** — ensure the integration branch is clean

### Branch Protection

- **Never commit directly to `dev` or `main`** — always use a feature branch
- **Never push directly to `dev` or `main`** — all changes reach these branches via pull request
- **Never merge locally** — do not run `git checkout dev && git merge`. Use GitHub PRs
- **Never force-push to shared branches** — force-push is only acceptable on your own feature branches

### Rebase Workflow

- **Rebase feature branches onto `dev`** before merging — keeps history linear and makes bisecting trivial
- **Never rebase shared/published branches** — only rebase branches you own that haven't been merged
- **After rebasing**, the developer (not Claude) handles the force-push

### Worktrees

Use `.worktrees/` (project-local, hidden) for isolated development branches. This directory is gitignored.

```bash
git worktree add .worktrees/<branch-name> -b <branch-name>
cd .worktrees/<branch-name> && pnpm install
```

- **Copy config files** to the worktree before running tests (e.g., `cp .env.local <worktree-path>/.env.local`)
- **Verify all tests pass** in the worktree before merging and on `dev` after merging
- **Run `pnpm quality`** in the worktree and on `dev` after finishing plans or committing changes

## API Integration

Widgets fetch from `api.perimeter.org` (perimeter-api) in production, `localhost:5500` in development. New widget endpoints follow perimeter-api's 5-layer architecture (Route -> Controller -> Service -> System -> Provider). See `../perimeter-api/CLAUDE.md` for API conventions.
