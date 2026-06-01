# CLAUDE.md

Guidance for Claude Code working in this repository.

## Status

**Phase 1 (streamline foundation) is the current shape.** The platform was rebuilt on a single mount path with a fast Vite studio: one `mount(host, definition, css, overrides?)` function drives both the production IIFE and the dev studio, CSS is imported as a `?inline` string and injected into the shadow root via a shared `CSSStyleSheet`, and there is no dual-render machinery and no build-time CSS codegen. A widget is built with the `widgetConfig({ name })` Vite-config helper plus an explicit per-widget `src/entry.ts`.

Streamline design spec: `docs/superpowers/specs/2026-05-29-perimeter-widgets-streamline-redesign-design.md`

Phase 1 implementation plan: `docs/superpowers/plans/2026-05-29-perimeter-widgets-streamline-phase-1-foundation.md`

Phase 2 (sermons port) implementation plan: `docs/superpowers/plans/2026-05-29-perimeter-widgets-streamline-phase-2-sermons-port.md`

Read the active spec/plan before modifying the platform.

**Building a widget:** see `docs/creating-a-widget.md` for the copy-the-example on-ramp. Run `pnpm dev` to open the Vite studio, which auto-discovers widgets and UI components and previews them through the real `mount()`.

**Phase 2 (sermons port) is done:** the `sermons` widget is back in the workspace and runs on the new contract (`src/widget.tsx` + `src/entry.ts`, `widgetConfig`, `@perimeter/api-hooks` for types/hooks). react-pdf's stylesheets are routed through `src/styles.css` via `@import` so they reach the shadow root; the per-widget gz budget is **900 KiB** (sermons lands ~859 KiB — a self-hosted-pdf-worker optimization to shrink it is a tracked follow-up).

**Phase 3 (hosting + release) is done:** `cdn/` is a committed static directory (immutable `cdn/<name>/<version>/index.js` + `.map`, a mutable `cdn/manifest.json` pointer, `cdn/vercel.json` cache/CORS headers with manifest-derived `latest.js` rewrites, and a manifest-driven `cdn/loader.js`) deployed as its **own** Vercel static project at `widgets.perimeter.org`. `pnpm release <name>` (the `@perimeter/release` package) builds a widget, copies it to the immutable path, updates the manifest + rewrites, prunes to the last 5 versions, and commits `chore(release): <name>@<version>`; it does not push or open a PR. Promote = merge the manifest change; rollback = revert the commit or Vercel Instant Rollback. The committed bundles are in `.prettierignore` (kept byte-for-byte). The actual Vercel deploy + DNS is a one-time manual step (not yet done). Full flow + embed snippets: `docs/hosting-and-release.md`.

**Phase 4 (production launch) is the active phase.** It is the production-launch runbook — a _first_ launch, not a flip from a live legacy embed (jsDelivr never served a live WordPress page, so there is no parallel-run or legacy fallback). Phase 4 plan + runbook: `docs/superpowers/plans/2026-06-01-perimeter-widgets-streamline-phase-4-cutover.md`. The repo-side doc cleanup is done; **going live is owner-driven** (needs Vercel + WordPress access): the one-time Vercel deploy of `cdn/` at `widgets.perimeter.org`, then the first WordPress embed of the sermons widget. The historical code blockers (bookmarkable URLs via a static nuqs prefix; the pdf.js worker, now self-hosted/inlined) are resolved by the rebuild. jsDelivr is **retired** — the old GitHub-served `dist/` CDN, its GitHub Action, and `pnpm publish-widget` are gone; the canonical hosting/embed doc is `docs/hosting-and-release.md`.

## Packages

| Package                         | Role                                                                       |
| ------------------------------- | -------------------------------------------------------------------------- |
| `@perimeter/theme`              | Design tokens (px radii), `resolveTokens`, `rewriteRootToHost`             |
| `@perimeter/widget-runtime`     | `mount`, `autoMount`, `defineWidget`, shadow `styling` module              |
| `@perimeter/vite-plugin-widget` | `widgetConfig()` Vite-config helper (rem→px, IIFE build)                   |
| `@perimeter/auth`               | Auth providers (carried over)                                              |
| `@perimeter/api-client`         | Typed API client (carried over)                                            |
| `@perimeter/api-hooks`          | React Query hooks + generated operation types (absorbed api-types)         |
| `@perimeter/ui`                 | shadcn components + `cn` + hooks (carried over)                            |
| `@perimeter/release`            | Dev-only release tooling behind `pnpm release` (nothing ships in a widget) |

`studio/` is the Vite studio app; `widgets/example` is the reference widget and `widgets/sermons` is the first production widget on the new platform. `cdn/` is the committed static hosting directory (deployed separately — see Phase 3 above and `docs/hosting-and-release.md`). (`release-store`, `api-types`, `apps/cdn`, and the Next.js `apps/studio` were removed in the streamline rebuild.)

## Commands

| Command               | Description                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install`        | Install dependencies                                                                                                                                                     |
| `pnpm dev`            | Run dev tasks across the workspace (Vite studio + widget watches)                                                                                                        |
| `pnpm build`          | Build every package via Turborepo                                                                                                                                        |
| `pnpm test`           | Run all tests                                                                                                                                                            |
| `pnpm lint`           | Lint all packages                                                                                                                                                        |
| `pnpm typecheck`      | Type-check all packages                                                                                                                                                  |
| `pnpm quality`        | typecheck + lint + test + prettier check (gate before PR)                                                                                                                |
| `pnpm release <name>` | Build a widget, publish it to the immutable `cdn/<name>/<version>/`, update the manifest + rewrites, prune to the last 5, and commit (see `docs/hosting-and-release.md`) |

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
