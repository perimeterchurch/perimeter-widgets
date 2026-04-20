# CLAUDE.md

shadcn-compatible component registry and showcase site for Perimeter Church. 55 components with interactive playgrounds, 5 page templates, token reference, and theme switching. Next.js static export deployed on Vercel at **https://style.perimeter.org**. Registry URL: `https://style.perimeter.org/r`.

## Commands

| Command                | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `pnpm dev`             | Start Next.js dev server (webpack — Turbopack not supported)     |
| `pnpm build`           | Generate themes + collect demos + build registry + Next.js build |
| `pnpm registry:build`  | Build registry JSON only (shadcn build)                          |
| `pnpm generate:themes` | Inject theme CSS into globals.css from `registry/themes/*.json`  |
| `pnpm collect:demos`   | Collect demo manifests and generate import map                   |
| `pnpm lint`            | Run ESLint                                                       |
| `pnpm format`          | Format with Prettier                                             |
| `pnpm format:check`    | Check formatting                                                 |
| `pnpm typecheck`       | TypeScript type checking                                         |
| `pnpm test`            | Run tests (none yet)                                             |
| `pnpm quality`         | Run all checks (typecheck + lint + format:check)                 |

## Architecture

- **Registry**: 55 shadcn components in `registry/ui/perimeter/`, built to `public/r/` via `shadcn build`
- **Showcase**: Component pages with interactive prop playgrounds, Shiki-highlighted code, and theme switching
- **Consumers**: Install via `pnpm dlx shadcn@latest add @perimeter/button`
- **Tokens**: Warm stone palette in OKLCH format, light + dark + project-specific themes in `registry/themes/`
- **Theme System**: JSON theme files → build-time CSS injection into globals.css → CSS variable inheritance

### Key Directories

| Directory                          | Purpose                                                        |
| ---------------------------------- | -------------------------------------------------------------- |
| `registry/ui/perimeter/`           | Component source (SINGLE SOURCE OF TRUTH)                      |
| `registry/ui/perimeter/*.demo.tsx` | Component demos with controls, examples, and meta              |
| `registry/themes/`                 | Theme definitions (default, perimeter-api, metrics)            |
| `src/app/`                         | Next.js routes (components, templates, tokens, docs)           |
| `src/templates/`                   | Full-page template compositions (dashboard, settings, etc.)    |
| `src/components/site/`             | Site chrome (top nav, sidebar, search, playground, code block) |
| `src/components/ui/`               | shadcn components for app use (NOT the registry source)        |
| `src/lib/demo-types.ts`            | Shared types (ManifestEntry, ControlsConfig, PlaygroundProps)  |
| `src/lib/highlight.ts`             | Server-side Shiki highlighting (vitesse themes)                |
| `src/lib/highlight-client.ts`      | Client-side Shiki highlighting for live code updates           |
| `scripts/`                         | Build and generation scripts                                   |
| `public/r/`                        | Built registry JSON (generated, gitignored)                    |

### Theme System

Theme files in `registry/themes/` are compiled to CSS at build time by `scripts/generate-theme-css.ts`, which injects tokens directly into `src/app/globals.css` between `@generated-themes-start` / `@generated-themes-end` markers. All components respond to theme changes via CSS variable inheritance.

- `default.json` — base warm stone palette (emitted as `:root` / `.dark`)
- Project themes (perimeter-api, metrics) — overrides only (emitted as `[data-theme="slug"]`)
- Runtime switching via `data-theme` attribute + `.dark` class on `<html>`

### Build Pipeline

```
pnpm build
  → pnpm registry:build     (shadcn build → public/r/)
  → pnpm generate:themes    (inject CSS vars into globals.css)
  → pnpm collect:demos      (generate manifest + import map)
  → next build              (static export, deployed on Vercel)
```

### Dev Server

`pnpm dev` uses `--webpack` because Turbopack hangs when tracing 55 dynamic demo imports. The webpack dev server compiles pages lazily on navigation.

## Context Loading (MANDATORY)

**Always read the relevant doc BEFORE searching the codebase or writing code.**

| Working on...       | Read first                                                   |
| ------------------- | ------------------------------------------------------------ |
| Unknown area        | `docs/README.md` (full index)                                |
| Registry components | `registry/ui/perimeter/`                                     |
| Demo files          | `registry/ui/perimeter/*.demo.tsx`, `src/lib/demo-types.ts`  |
| Templates           | `src/templates/`, `src/app/templates/`                       |
| Theme tokens        | `registry/themes/default.json`, `src/app/globals.css`        |
| Theme generation    | `scripts/generate-theme-css.ts`, `registry/themes/`          |
| Registry build      | `scripts/generate-registry.ts`, `registry.json`              |
| Site navigation     | `src/components/site/`                                       |
| Site layout         | `src/app/layout.tsx`, `src/components/site/`                 |
| Code blocks         | `src/components/site/code-block.tsx`, `src/lib/highlight.ts` |

## Creating Component Demos

Every component in `registry/ui/perimeter/` should have a co-located demo file (`component-name.demo.tsx`). The demo powers the showcase page with interactive playground, code snippets, and examples.

### Required Exports

Every demo file MUST export exactly these four items:

```typescript
import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

// 1. Meta — component metadata (ALL fields required or file is skipped)
export const meta = {
  name: "Button",                                              // Display name
  description: "Displays a button.",                           // One-liner
  category: "actions",                                         // Lowercase: actions, inputs, layout, navigation, etc.
  install: "pnpm dlx shadcn@latest add @perimeter/button",    // Install command
};

// 2. Controls — interactive playground knobs
export const controls = {
  variant: {
    type: "enum",                                              // "enum" | "boolean" | "string" | "number"
    options: ["default", "secondary", "outline"] as const,     // Required for enum
    default: "default",
  },
  disabled: { type: "boolean", default: false },
  children: { type: "string", default: "Click me" },
  count:    { type: "number", default: 1, min: 0, max: 10 },  // min/max/step optional
} satisfies ControlsConfig;

// 3. Playground — renders component with control values
export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <Button variant={props.variant as "default"} disabled={props.disabled}>
      {props.children}
    </Button>
  );
}

// 4. Examples — static showcase examples with source extraction
export const examples = [
  {
    name: "All Variants",
    render: () => (
      <div className="flex gap-2">
        <Button variant="default">Default</Button>
        <Button variant="outline">Outline</Button>
      </div>
    ),
  },
];
```

### Key Rules

- **Use `"use client"` in demos that use hooks** — demos using `useState` or other hooks need the `"use client"` directive. The showcase page dynamically imports demo modules and can read their exports during SSG
- **All four `meta` fields are required** — missing any causes "Skipping {file}: missing meta fields" in `pnpm collect:demos`
- **Use double-quoted strings in `meta`** — the collector extracts values via regex, not TypeScript parsing
- **Use `satisfies ControlsConfig`** on controls for type safety
- **Cast enum props in Playground** — `props.variant as "default"` (React won't accept the union type)
- **Example `render` must be arrow function** — `render: () => (...)` with balanced parentheses. The source extractor relies on this syntax
- **`controls = {}` and `examples = []`** are valid when a component has no interactive controls or static examples
- **Run `pnpm collect:demos`** after creating or modifying demo files to regenerate the manifest

### Controlled vs Uncontrolled Components

Components should support both **controlled** (`value` + `onValueChange`) and **uncontrolled** (`defaultValue`) modes, following the Base UI pattern:

```typescript
interface Props {
  value?: string | null; // Controlled — component reflects this value
  defaultValue?: string | null; // Uncontrolled — initial value, component manages state internally
  onValueChange?: (value: string | null) => void; // Called in both modes
}
```

**In demos**, always use uncontrolled mode so the demo file doesn't need `"use client"` or hooks:

```typescript
// Good — uncontrolled, no hooks needed, works server-side
export function Playground(props: PlaygroundProps<typeof controls>) {
  return <MultiCombobox options={options} placeholder={props.placeholder} />;
}

export const examples = [
  { name: "With Default", render: () => (<MultiCombobox options={options} defaultValue="apple" />) },
];
```

**In applications**, use controlled mode when you need to read or synchronize the value:

```typescript
const [value, setValue] = useState<string | null>(null);
<MultiCombobox options={options} value={value} onValueChange={setValue} />
```

## Critical Rules

### Project-Specific

- **`registry/ui/perimeter/` is the single source of truth for components** — never edit built output in `public/r/`
- **Always run `pnpm registry:build` after modifying registry items** — the built JSON in `public/r/` must stay in sync
- **Demo files must use `() => (...)` syntax for render functions** — the source extraction utility (`src/lib/extract-source.ts`) relies on balanced parenthesis counting
- **No `.env` needed** — this is a static site with no secrets, deployed on Vercel. Theme list is discovered at build time via `readdirSync` in `src/app/layout.tsx`
- **Update CHANGELOG.md for user-facing changes** — when modifying components, themes, templates, or the showcase site, add an entry under the `[Unreleased]` section in `CHANGELOG.md`
- **Generated files are gitignored** — `src/lib/demo-manifest.json`, `src/lib/demo-imports.ts`, and `registry.json` are build outputs. Run `pnpm collect:demos` and `pnpm registry:build` to regenerate

### Cross-Project

- **Always use `pnpm`** — never npm or npx. Use `pnpm dlx` instead of `npx`
- **Never commit directly to `dev` or `main`** — always create a feature branch off `dev`
- **Never push directly to `dev` or `main`** — all changes reach `dev` via pull request
- **Never merge locally** — do not run `git merge` or `git checkout dev && git merge`. Use `gh pr create` to open a PR, and the developer merges via GitHub
- **Run `pnpm quality` before opening a PR** — the branch must pass all checks before it's eligible for review
- **Always fix formatting in files you touched** — run `pnpm prettier --write` on affected files. Flag pre-existing issues in untouched files without fixing them
- **Conventional commits:** `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`
- **Always use `--body-file` for PR commands** — write the PR body to a temp file with the **Write tool**, then pass it with `gh pr create --body-file <path>`. This prevents ANSI escape codes from leaking into PR descriptions
- **Read docs before code** — always read the relevant `docs/` file before searching or modifying an area of the codebase
- **Update docs when changing code** — if you changed behavior that a doc describes, the doc must be updated in the same commit
- **Always verify, never assume** — when uncertain about external API behavior, library usage, or domain logic, research first using web search, Context7 MCP, or project docs
- **Never add eslint-disable comments** — fix the underlying code instead of suppressing warnings
- **Never use `any` in production code** — use proper types, generics, or `unknown` instead. Test files are exempt

## Code Philosophy

Code should be self-documenting. How you split logic into functions and shape the data they pass around determines how well a codebase holds up over time.

### Keep It Simple (YAGNI)

Write the simplest code that solves the current problem. Do not build for hypothetical future requirements.

- **No premature abstractions** — three similar lines of code is better than a utility function used once. Extract only when a pattern repeats and the abstraction is obvious
- **No speculative generality** — don't add config options, feature flags, or extension points "in case we need them later"
- **Prefer deletion over deprecation** — if something is unused, remove it. Don't leave commented-out code or backwards-compatibility shims
- **Complexity is a cost** — every abstraction, indirection, and configuration option is maintenance burden

### Semantic Functions

The building blocks of the codebase. A semantic function should be **minimal, pure, and self-describing**:

- **All inputs in, all outputs out** — take everything needed as parameters, return results directly. No hidden state or side effects (unless the side effect is the explicit goal)
- **Safe to reuse without reading internals** — callers should trust the name and signature, not the implementation
- **No comments needed** — the code itself is the documentation. If you need a comment, the function name or structure isn't clear enough
- **Composable** — semantic functions can wrap other semantic functions to describe complex flows. Even if a wrapper is only used once, it indexes the logic for future readers
- **Naturally unit-testable** — if it's hard to test, it's probably doing too much

Examples: `quadraticFormula()`, `retryWithExponentialBackoff<T>(action: () => T, betweenRetries: () => void)`

### Pragmatic Functions

Wrappers around semantic functions and unique logic — the complex processes of the codebase:

- **Used in few places** — if a pragmatic function is used widely, break its logic into semantic functions
- **Expected to change** — their insides and behavior will evolve over time
- **Doc comments for the unexpected** — don't restate the name. Note surprising behavior ("fails early on balance less than 10") or combat misconceptions. Take existing doc comments with a grain of salt — they may be stale
- **Integration-tested** — test through the flows they orchestrate, not by mocking internals

Examples: `provisionNewWorkspaceForGithubRepo(repo, user)`, `handleUserSignupWebhook()`

### Models

**Make wrong states impossible.** Every optional field is a question the rest of the codebase must answer every time it touches that data.

- **Name precisely** — if you can't tell whether a field belongs by looking at the model name, the model is trying to be too many things
- **Compose, don't merge** — `UserAndWorkspace { user: User, workspace: Workspace }` keeps both models intact instead of flattening workspace fields into User
- **Use brand types** — values with identical shapes can represent different concepts. `DocumentId(UUID)` instead of bare `UUID` makes swapping two IDs a compile error instead of a silent bug
- **Split when fields stop cohering** — when optional fields accumulate and the name no longer describes the data, split into the distinct things being coupled together

## TypeScript Standards

### Strict Configuration

- `strict: true` is enabled in tsconfig.json — do not weaken it
- All function parameters and return types should be inferable or explicitly typed
- Prefer `unknown` over `any` when the type is genuinely not known

### Type Safety Rules

- Use discriminated unions for state that can be in multiple forms
- Prefer `interface` for object shapes that will be extended, `type` for unions and computed types
- Use `as const` for literal tuples and objects that should not widen
- Avoid type assertions (`as`) — narrow with type guards instead
- Generic constraints should be as tight as possible
- Never use TypeScript `enum` — use `as const` objects with derived union types instead

### Import Ordering and Path Aliases

**Always use path aliases over relative imports** when crossing directories. Relative imports are only acceptable within the same directory or its immediate children.

Imports should be ordered from furthest to closest, with a blank line between each group:

```typescript
// 1. Node built-ins
import { readdirSync } from "node:fs";

// 2. External dependencies
import { createHighlighter } from "shiki";

// 3. Path aliases (internal code)
import { highlight } from "@/lib/highlight";
import { Button } from "@registry/ui/perimeter/button";

// 4. Relative imports (same directory)
import { PlaygroundControls } from "./playground-controls";

// 5. Type-only imports
import type { ControlsConfig } from "@/lib/demo-types";
```

## File Naming and Organization

This project uses Next.js App Router conventions:

- **Route files**: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`
- **Components**: PascalCase for component files (`Button.tsx`), kebab-case for directories
- **Utilities**: camelCase (`formatDate.ts`)
- **Types**: colocate with the module that owns them, or in a shared `types.ts`
- **Registry components**: kebab-case in `registry/ui/perimeter/` matching shadcn convention
- **Demo files**: co-located with component: `button.demo.tsx` beside `button.tsx`
- **Barrel exports**: use sparingly — only for public API boundaries

## Error Handling

- Use early returns to handle error cases before the happy path
- Throw errors with descriptive messages that include relevant context
- Never swallow errors silently — log them at minimum
- In React components, use error boundaries for runtime errors

## Logging

- Use `console.error` for errors that need attention
- Use `console.warn` for degraded behavior that still works
- Avoid `console.log` in production code — use it only during development
- Never log sensitive data (tokens, passwords, PII)

## Testing

- Test files live next to the code they test: `Button.test.tsx` beside `Button.tsx`
- Name test files with `.test.ts` or `.test.tsx` suffix
- Each test should test one behavior and have a descriptive name
- Prefer testing behavior over implementation details
- Use factories or builders for test data, not raw object literals

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
- **Run `pnpm quality` before opening** — the branch must pass typecheck + lint + format
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

### Worktrees

Use `.worktrees/` (project-local, hidden) for isolated development branches. This directory is gitignored.

```bash
git worktree add .worktrees/<branch-name> -b <branch-name>
cd .worktrees/<branch-name> && pnpm install
```

Note: Turbopack does not work in worktrees (resolves parent directory). The `--webpack` flag in `pnpm dev` handles this.

## Project Configuration

### Path Aliases

| Alias         | Maps To        | Used For                                  |
| ------------- | -------------- | ----------------------------------------- |
| `@/*`         | `./src/*`      | App code (components, lib, hooks)         |
| `@registry/*` | `./registry/*` | Registry components and demo file imports |

### Key Config Files

| File                 | Purpose                                        |
| -------------------- | ---------------------------------------------- |
| `components.json`    | shadcn registry configuration                  |
| `next.config.ts`     | Next.js configuration                          |
| `tsconfig.json`      | TypeScript configuration                       |
| `postcss.config.mjs` | PostCSS with Tailwind CSS v4                   |
| `eslint.config.mjs`  | ESLint flat config                             |
| `.prettierignore`    | Excludes generated/build files from formatting |
