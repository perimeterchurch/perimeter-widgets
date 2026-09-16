# Collaborating on Perimeter Widgets with Claude Code

How to work productively in this repo with Claude Code. For architecture and operating rules, read **[CLAUDE.md](CLAUDE.md)** first; for the human getting-started path, see **[README.md](README.md)**.

## What this repo is

A Turborepo monorepo of embeddable React widgets that render in a shadow DOM via a single `mount()` path, plus the supporting platform:

- `@perimeter/ui` — shadcn-based component library; `@perimeter/theme` — design tokens.
- `studio/` — the Vite studio: local dev harness **and** the deployed design-system site (style.perimeter.org).
- `widgets/*` — the embeddable widgets (`example` is the reference, `sermons` is the first production one). Each builds to a single IIFE and ships via `pnpm release` into the committed static `cdn/` directory served at widgets.perimeter.org.

## Prerequisites

- **Node.js** 22+ and **pnpm** 10 (`10.32.1`, pinned via `packageManager`; `corepack enable`). Always use `pnpm` — never `npm`/`npx`.

## First-time setup

```bash
git clone <repo-url> && cd perimeter-widgets
pnpm install
```

No env file or credentials are required to run the studio. For data-backed previews, run the sibling **perimeter-api** (`pnpm dev`, serves on `:5500`); the studio targets `http://localhost:5500` automatically in dev (see `studio/.env.development`).

## Run / test / build

| Command                                         | What it does                                              |
| ----------------------------------------------- | --------------------------------------------------------- |
| `pnpm dev`                                      | Vite studio at `http://localhost:5173` + widget watches   |
| `pnpm build`                                    | Build every package/widget via Turborepo                  |
| `pnpm test` / `lint` / `typecheck`              | Run that gate task across the workspace                   |
| `pnpm format`                                   | Prettier write — run before `pnpm quality`                |
| `pnpm quality`                                  | The pre-PR gate: typecheck + lint + test + `format:check` |
| `pnpm embed-lab`                                | Bare-host test pages at `http://localhost:4400`           |
| `pnpm create-widget <name>`                     | Scaffold a new widget                                     |
| `pnpm release <name> --patch\|--minor\|--major` | Bump, build, publish to `cdn/`, open a PR                 |

The full command table lives in [CLAUDE.md](CLAUDE.md).

## Branch & PR workflow

- **Never commit or push to `dev` or `main`.** Branch off `dev` for every change.
- Conventional-commit messages: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, `ci:`.
- Run `pnpm format` then `pnpm quality` before opening a PR (the gate runs `format:check`, so don't make formatting-only commits).
- Open the PR against `dev` with a body file (never inline `--body`):
  ```bash
  gh pr create --base dev --title "feat: …" --body-file /tmp/pr-body.md
  ```
- `main` is updated only via a **batched release PR** from `dev` (titled `Release: …`), when the developer decides `dev` is stable. The developer merges via GitHub — never merge locally.

## Claude skills in this repo

- **`creating-a-widget`** (`.claude/skills/creating-a-widget/SKILL.md`) — orchestrates building a new widget or widget-backing API endpoint end to end (MP schema discovery → perimeter-api endpoint → api-hooks type regen → scaffold → style → test → release). Invoke it when adding a widget.

## Where to read first

1. [CLAUDE.md](CLAUDE.md) — architecture, packages, commands, critical rules.
2. [docs/README.md](docs/README.md) — the documentation index (single-sourced; also rendered in the studio).
3. [docs/guides/developer-setup.md](docs/guides/developer-setup.md) and [docs/creating-a-widget.md](docs/creating-a-widget.md).

## Common gotchas

- **The studio is not proof of embed rendering.** It shares page-level context (Tailwind, a root font-size, `@property` registrations) a real host page lacks. Re-verify any styling / mount / theme-CSS / build-toolchain change on a bare host page: `pnpm embed-lab` and `pnpm --filter @perimeter/parity visual` (build widgets first).
- **Run gate tasks from the root** — they go through Turborepo. Packages have no local vitest binary, so `pnpm vitest` inside a package fails; scope with `--filter=<pkg>`.
- **`docs/` is `.prettierignore`d** — authored `.md`/`.mdx` validity is proven by the studio build (`pnpm --filter @perimeter/studio build`), not by `pnpm format`.
- **Shadow-DOM styling is non-obvious** — three transforms (rem→px, `:root`→`:host`, `@property` fallback inlining) make Tailwind v4 tokens work on a real embed. See CLAUDE.md "Shadow-DOM style inheritance".
