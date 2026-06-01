# Perimeter Widgets Documentation

Turborepo monorepo of self-contained React widgets for embedding on perimeter.org (WordPress). Each widget compiles to a single IIFE script, renders inside a shadow DOM for style isolation, and fetches data from `api.perimeter.org`.

## Architecture

- [Overview](architecture/overview.md) — Monorepo structure, build pipeline, shadow DOM mounting
- [Shared Package](architecture/shared-package.md) — API client, auth, mount utility, components, design tokens
- [Vite Preset](architecture/vite-preset.md) — `createWidgetConfig()`, `createWidgetTestConfig()`, build output
- [CDN & Deployment](architecture/cdn-deployment.md) — static `cdn/` on Vercel (`widgets.perimeter.org`), `pnpm release`, manifest pointer

## Widgets

- [Sermons](widgets/sermons.md) — Search/browse sermons and series, watch/listen view

## Guides

- [Developer Setup](guides/developer-setup.md) — Environment, pnpm, dev server, storyboard
- [Developer Rules](guides/developer-rules.md) — Git workflow, conventions, quality checks
- [Adding a Widget](guides/adding-a-widget.md) — Step-by-step guide for creating a new widget
- [Authentication](guides/authentication.md) — MP OAuth token from WordPress, auth flow
- [Testing](guides/testing.md) — Vitest patterns, widget test setup, mocking

## Reference

- [Widget Embed Guide](reference/embed-guide.md) — WordPress embed patterns, data attributes, loading states
- [Design Tokens](reference/design-tokens.md) — Colors, typography, spacing, border radius
