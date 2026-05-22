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
