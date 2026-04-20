# Contributing

How to set up the project locally and contribute changes.

## Setup

```bash
git clone <repo-url>
cd style
pnpm install
pnpm dev
```

The dev server starts at `http://localhost:3000` using webpack (Turbopack is disabled due to dynamic import tracing issues).

## Branch Workflow

Always create a feature branch — never commit directly to `dev` or `main`:

```bash
git checkout -b feat/my-change
```

Use conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`.

## Quality Checks

Run before merging:

```bash
pnpm quality    # typecheck + lint + format:check
```

Fix formatting on touched files: `pnpm prettier --write <file>`.

## Adding or Modifying Components

1. Edit the component in `registry/ui/perimeter/`
2. Update or create a `.demo.tsx` file alongside it (see `src/lib/demo-types.ts` for the demo structure)
3. Run `pnpm registry:build` to regenerate the registry
4. Run `pnpm collect:demos` to update the demo manifest
5. Update `CHANGELOG.md` under `[Unreleased]`

## Component Demo Structure

Every demo exports: `meta` (name, description, category, install), `controls` (prop definitions), `Playground` (interactive component), and `examples` (array of named renders). Example render functions must use `() => (...)` syntax.
