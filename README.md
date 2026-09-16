# Perimeter Widgets

A Turborepo monorepo of self-contained, embeddable React widgets for perimeter.org (WordPress). Each widget compiles to a single IIFE script, renders inside a shadow root for style isolation via one `mount()` path, and fetches data from `api.perimeter.org`. The repo also houses the `@perimeter/ui` component library, `@perimeter/theme` design tokens, and a Vite **studio** that is both the local dev harness and the deployed design-system site at [style.perimeter.org](https://style.perimeter.org).

## Prerequisites

- **Node.js** 22+ (`engines.node` is `>=22`)
- **pnpm** 10 — pinned via `packageManager` (`10.32.1`); `corepack enable` picks it up. Always use `pnpm`, never `npm`/`npx`.

## Quick start

```bash
pnpm install      # install dependencies
pnpm dev          # start the Vite studio at http://localhost:5173
pnpm quality      # the pre-PR gate: typecheck + lint + test + format:check
```

The studio auto-discovers widgets and `@perimeter/ui` components and previews them through the real `mount()` path. For data-backed previews, run the sibling **perimeter-api** (`pnpm dev`, serves on `:5500`) alongside it — the studio targets `http://localhost:5500` automatically in dev.

## Learn more

- [`docs/README.md`](docs/README.md) — documentation index (also rendered at style.perimeter.org).
- [`docs/guides/developer-setup.md`](docs/guides/developer-setup.md) — environment, pnpm, the studio, dev commands.
- [`ONBOARDING.md`](ONBOARDING.md) — collaborating on this repo with Claude Code.
- [`CLAUDE.md`](CLAUDE.md) — architecture and operating rules.
