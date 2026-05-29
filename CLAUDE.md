# CLAUDE.md

Guidance for Claude Code working in this repository.

## Status

**Phase 1 (streamline foundation) is the current shape.** The platform was rebuilt on a single mount path with a fast Vite studio: one `mount(host, definition, css, overrides?)` function drives both the production IIFE and the dev studio, CSS is imported as a `?inline` string and injected into the shadow root via a shared `CSSStyleSheet`, and there is no dual-render machinery and no build-time CSS codegen. A widget is built with the `widgetConfig({ name })` Vite-config helper plus an explicit per-widget `src/entry.ts`.

Streamline design spec: `docs/superpowers/specs/2026-05-29-perimeter-widgets-streamline-redesign-design.md`

Phase 1 implementation plan: `docs/superpowers/plans/2026-05-29-perimeter-widgets-streamline-phase-1-foundation.md`

Read the active spec/plan before modifying the platform.

**Building a widget:** see `docs/creating-a-widget.md` for the copy-the-example on-ramp. Run `pnpm dev` to open the Vite studio, which auto-discovers widgets and UI components and previews them through the real `mount()`.

**Later phases:** Phase 2 ports the sermons widget onto the new contract (its source stays in the tree but is out of the pnpm workspace until then); Phase 3 adds hosting + a release CLI (there is no `publish-widget` script yet); Phase 4 cuts over to `widgets.perimeter.org`. Each gets its own plan.

## Packages

| Package                         | Role                                                               |
| ------------------------------- | ------------------------------------------------------------------ |
| `@perimeter/theme`              | Design tokens (px radii), `resolveTokens`, `rewriteRootToHost`     |
| `@perimeter/widget-runtime`     | `mount`, `autoMount`, `defineWidget`, shadow `styling` module      |
| `@perimeter/vite-plugin-widget` | `widgetConfig()` Vite-config helper (rem→px, IIFE build)           |
| `@perimeter/auth`               | Auth providers (carried over)                                      |
| `@perimeter/api-client`         | Typed API client (carried over)                                    |
| `@perimeter/api-hooks`          | React Query hooks + generated operation types (absorbed api-types) |
| `@perimeter/ui`                 | shadcn components + `cn` + hooks (carried over)                    |

`studio/` is the Vite studio app; `widgets/example` is the reference widget. (`release-store`, `api-types`, `apps/cdn`, and the Next.js `apps/studio` were removed in this phase.)

## Commands

| Command          | Description                                                       |
| ---------------- | ----------------------------------------------------------------- |
| `pnpm install`   | Install dependencies                                              |
| `pnpm dev`       | Run dev tasks across the workspace (Vite studio + widget watches) |
| `pnpm build`     | Build every package via Turborepo                                 |
| `pnpm test`      | Run all tests                                                     |
| `pnpm lint`      | Lint all packages                                                 |
| `pnpm typecheck` | Type-check all packages                                           |
| `pnpm quality`   | typecheck + lint + test + prettier check (gate before PR)         |

## Critical rules

- Always use `pnpm`; never npm or npx.
- Never commit directly to `dev` or `main`. Use a feature branch and a PR.
- Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, `ci:`.
- Read the active phase spec before modifying the platform.
- Read a file before editing it — always read the current contents before an edit so you don't clobber unseen changes.
- Run tests, lint, and typecheck from the root — `pnpm test`/`lint`/`typecheck` go through Turborepo. Packages delegate to `turbo test` and have no local vitest binary, so `pnpm vitest` inside a package fails; scope one package with `--filter=<pkg>`.
- Run `pnpm format` before `pnpm quality` — the quality gate only runs `format:check` and fails on unformatted files; don't create separate formatting-only commits.

## Prior state

Pre-rebuild code is archived at the `legacy/v1` branch.
