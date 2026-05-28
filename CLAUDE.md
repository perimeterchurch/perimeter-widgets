# CLAUDE.md

Guidance for Claude Code working in this repository.

## Status

Phases 1 (foundation), 2 (sermons cutover prep), and 3 (hosting + release) are complete.

Umbrella spec: `docs/superpowers/specs/2026-05-22-perimeter-widgets-rebuild-design.md`

Phase 3 design spec: `docs/superpowers/specs/2026-05-27-perimeter-widgets-phase-3-hosting-release-design.md`

Phase 3 implementation plan: `docs/superpowers/plans/2026-05-27-perimeter-widgets-phase-3-hosting-release.md`

**Release workflow:** run `pnpm publish-widget <name>` to build, upload, and record a new version, then promote it at `/admin/releases` on the studio.

**Phase 4** is next: cutover from jsDelivr to `widgets.perimeter.org`.

## Commands

| Command          | Description                                                  |
| ---------------- | ------------------------------------------------------------ |
| `pnpm install`   | Install dependencies                                         |
| `pnpm dev`       | Run dev tasks across the workspace (Studio + widget watches) |
| `pnpm build`     | Build every package via Turborepo                            |
| `pnpm test`      | Run all tests                                                |
| `pnpm lint`      | Lint all packages                                            |
| `pnpm typecheck` | Type-check all packages                                      |
| `pnpm quality`   | typecheck + lint + test + prettier check (gate before PR)    |

## Critical rules

- Always use `pnpm`; never npm or npx.
- Never commit directly to `dev` or `main`. Use a feature branch and a PR.
- Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, `ci:`.
- Read the active phase spec before modifying the platform.

## Prior state

Pre-rebuild code is archived at the `legacy/v1` branch.
