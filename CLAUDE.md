# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

A Turborepo monorepo of embeddable React widgets that render in a shadow DOM on a single mount path: one `mount(host, definition, css, overrides?)` drives both the production IIFE bundle and the dev studio, CSS is imported as a `?inline` string and injected into the shadow root via a shared `CSSStyleSheet`, and a widget is built with the `widgetConfig({ name })` Vite-config helper plus a per-widget `src/entry.ts`. Widgets get their data from **perimeter-api** (sibling project, prod `https://api.perimeter.org`) through typed React Query hooks in `@perimeter/api-hooks`. The `studio/` Vite app is both the local dev harness and the deployed design-system site at **style.perimeter.org**; shipped bundles live in the committed static `cdn/` directory deployed at **widgets.perimeter.org**.

## Packages

| Package                         | Role                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `@perimeter/theme`              | Design tokens (px radii), `resolveTokens`, `rewriteRootToHost`                |
| `@perimeter/widget-runtime`     | `mount`, `autoMount`, `defineWidget`, shadow `styling` module                 |
| `@perimeter/vite-plugin-widget` | `widgetConfig()` Vite-config helper (rem→px, IIFE build)                      |
| `@perimeter/auth`               | Auth providers                                                                |
| `@perimeter/api-client`         | Typed API client (`fetchJson`, `serializeQuery`, `useApiClient`)              |
| `@perimeter/api-hooks`          | React Query hooks + generated perimeter-api operation types                   |
| `@perimeter/ui`                 | shadcn-based component library + `cn` + hooks                                 |
| `@perimeter/release`            | Dev-only tooling behind `pnpm release` + `pnpm create-widget` (nothing ships) |
| `@perimeter/parity`             | Dev-only dev↔prod parity reports (`parity:css`, `parity:components`)          |

`studio/` is the Vite studio app (dev harness + deployed design-system site). `widgets/example` is the reference widget; `widgets/sermons` is the first production widget. `cdn/` is the committed static hosting directory, deployed as its own Vercel project (see `docs/hosting-and-release.md`).

## Commands

| Command                                         | Description                                                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                                  | Install dependencies                                                                                              |
| `pnpm dev`                                      | Run the Vite studio + widget watches (auto-discovers widgets and UI components)                                   |
| `pnpm build`                                    | Build every package via Turborepo                                                                                 |
| `pnpm test` / `lint` / `typecheck`              | Run the gate task across the workspace (via Turborepo)                                                            |
| `pnpm format`                                   | Prettier write (run before `pnpm quality`)                                                                        |
| `pnpm quality`                                  | typecheck + lint + test + `format:check` — the gate before a PR                                                   |
| `pnpm create-widget <name>`                     | Scaffold `widgets/<name>/` from the template and print next steps                                                 |
| `pnpm release <name>`                           | Build, publish to immutable `cdn/<name>/<version>/`, update manifest, prune to 5, commit (no push)                |
| `pnpm release <name> --patch\|--minor\|--major` | Bump the version, then build + publish on a fresh `release/<name>-<version>` branch, push, and open the PR to dev |
| `pnpm --filter @perimeter/api-hooks sync`       | Copy perimeter-api's `openapi/spec.yaml` and regenerate `src/generated/operations.ts`                             |
| `pnpm parity:css` / `parity:components`         | Generate the dev↔prod parity reports                                                                              |

## Critical rules

- Always use `pnpm`; never npm or npx.
- Never commit directly to `dev` or `main`. Use a feature branch and a PR (`--body-file`, never inline `--body`).
- Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, `ci:`.
- Read a file before editing it.
- Run `pnpm test`/`lint`/`typecheck`/`quality` from the root — they go through Turborepo. Packages have no local vitest binary, so `pnpm vitest` inside a package fails; scope one package with `--filter=<pkg>`.
- Run `pnpm format` before `pnpm quality` — the gate only runs `format:check` and fails on unformatted files; don't create separate formatting-only commits. (The entire `docs/` tree is `.prettierignore`'d, so authored `.md`/`.mdx` are validated by the studio build, not by prettier.)

## Building a widget

Start at `docs/creating-a-widget.md` for the copy-the-example on-ramp; the **`creating-a-widget`** Claude skill (`.claude/skills/creating-a-widget/SKILL.md`) orchestrates the full path (MP data → perimeter-api endpoint → regenerated api-hooks types → scaffold → style → test → release).

## Doc pointers

- `docs/creating-a-widget.md` — build a widget end-to-end (canonical on-ramp).
- `docs/guides-mdx/styling-widgets.mdx` — styling a widget (tokens-first, `@perimeter/ui`); also rendered at style.perimeter.org/guides.
- `docs/hosting-and-release.md` — the `cdn/` hosting model, `pnpm release` flow, and embed snippets.
- `docs/deploying-studio.md` — deploying the studio to style.perimeter.org.
- `docs/components/*.mdx` — per-component usage docs (rendered live in the studio).

## History

The phase-by-phase streamline + overhaul narrative (streamline rebuild, sermons port, hosting/release, cutover, the studio/DX overhaul) lives in `docs/superpowers/2026-06-02-session-handoff.md` and the plans/specs under `docs/superpowers/`. Pre-rebuild code is archived at the `legacy/v1` branch.
