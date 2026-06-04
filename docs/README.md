# Perimeter Widgets Documentation

A Turborepo monorepo of self-contained React widgets for embedding on perimeter.org (WordPress). Each widget compiles to a single IIFE script, renders inside a shadow root for style isolation via one `mount()` path, and fetches data from `api.perimeter.org`.

Docs are single-sourced: humans read them at **[style.perimeter.org](https://style.perimeter.org)** (the deployed studio), and Claude reads the same markdown here. The `docs/` tree is `.prettierignore`d, so MDX validity is proven by the studio build (`pnpm --filter @perimeter/studio build`), not by `pnpm format`.

## Getting started

- [Creating a widget](creating-a-widget.md) — the on-ramp: `pnpm create-widget`, the per-file walkthrough, preview, build, quality gate, release.
- The studio (`pnpm dev`) — auto-discovers widgets and components and previews them through the real `mount()`. It is also the deployed design-system site at `style.perimeter.org`.

## Guides

The MDX guides render live at `style.perimeter.org/guides` and are the Claude-facing docs.

- [Building a widget end to end](guides-mdx/building-a-widget-end-to-end.mdx) — the narrative spine: scaffolder, widget anatomy, dev loop, and the deeper guides (live at `/guides/building-a-widget-end-to-end`).
- [Data & API](guides-mdx/data-and-api.mdx) — wiring a widget to perimeter-api: the endpoint, regenerated api-hooks types, and the hook (live at `/guides/data-and-api`).
- [Styling widgets](guides-mdx/styling-widgets.mdx) — tokens-first styling, `@perimeter/ui`, the design system (live at `/guides/styling-widgets`).
- [Developer Setup](guides/developer-setup.md) — environment, pnpm, the studio, dev commands.
- [Developer Rules](guides/developer-rules.md) — git workflow, conventions, quality checks.
- [Authentication](guides/authentication.md) — MP OAuth token from WordPress, auth modes.
- [Testing](guides/testing.md) — Vitest patterns, widget test setup, mocking API hooks, the bundle budget.

## Reference

- **Components** — `docs/components/*.mdx`, rendered live at `style.perimeter.org/components/:name` through the shadow-DOM stage.
- **Tokens** — the full `@perimeter/theme` reference, rendered live at `style.perimeter.org/tokens`.
- [Widget Embed Guide](reference/embed-guide.md) — WordPress embed patterns, the loader, data attributes.

## Hosting & release

- [Hosting & Release](hosting-and-release.md) — the committed `cdn/` model, `pnpm release`, promote/rollback, embed snippets (canonical).
- [Deploying](deploying.md) — take the platform live: deploy the CDN to `widgets.perimeter.org`, verify, WordPress embed, monitor.
- [Deploying the studio](deploying-studio.md) — deploy the design-system site to `style.perimeter.org`.

## Architecture

- [Overview](architecture/overview.md) — monorepo structure, package roles, the single mount path.
- [CDN & Deployment](architecture/cdn-deployment.md) — short summary of the static `cdn/` model (redirects to Hosting & Release).

## Widgets

- [Sermons](widgets/sermons.md) — search/browse sermons and series, watch/listen view.

> History (streamline specs, phase plans, session handoffs) lives under `docs/superpowers/` and is reference-only.
