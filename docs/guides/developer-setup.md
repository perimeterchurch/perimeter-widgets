# Developer Setup

> **Scope:** Local environment, pnpm, dev server, storyboard, Storybook
> **Key files:** `package.json`, `turbo.json`, `pnpm-workspace.yaml`
> **Last verified:** 2026-03-17

---

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 20+ | Project tested against v25 |
| pnpm | 10+ | Install: `corepack enable && corepack prepare pnpm@latest` |

Always use `pnpm` — never `npm` or `npx`.

---

## Getting Started

```bash
# Clone the repository
git clone <repo-url> && cd perimeter-widgets

# Install dependencies
pnpm install

# Start the widget storyboard (dev preview)
pnpm dev

# Start Storybook for shared components
pnpm storybook
```

---

## Dev Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start widget storyboard on port 5180 |
| `pnpm storybook` | Start shared component Storybook on port 6006 |
| `pnpm build` | Build all widgets to `dist/` |
| `pnpm build --filter=widget-sermons` | Build a single widget |
| `pnpm test` | Run all tests via Turborepo |
| `pnpm test --filter=widget-sermons` | Run tests for a single widget |
| `pnpm lint` | ESLint across all packages |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm format` | Auto-format with Prettier |
| `pnpm quality` | Run all checks (typecheck + lint + format + test) |

---

## Storyboard

The storyboard (`packages/storyboard/`) is a custom Vite dev app for previewing full widgets in their shadow DOM containers.

- Runs on `http://localhost:5180`
- Sidebar navigation for switching between widgets
- MSW (Mock Service Worker) intercepts API calls — no real API needed
- Widgets render inside shadow DOM exactly as they would on WordPress
- Supports data-attribute config overrides

---

## Storybook

Storybook (`packages/shared/.storybook/`) is for developing and documenting shared UI components in isolation.

- Runs on `http://localhost:6006`
- Stories co-located with components (`Button.stories.tsx` next to `Button.tsx`)
- Tailwind design tokens loaded in preview

---

## Building Widgets

```bash
# Build all widgets
pnpm build

# Build a specific widget
pnpm build --filter=widget-sermons

# Output
dist/sermons/sermons.js     # IIFE bundle
dist/manifest.json           # Auto-generated metadata
```

The `dist/` directory is committed to the repo for jsDelivr CDN serving.

---

## Related Docs

- [Developer Rules](developer-rules.md) — Git workflow, conventions
- [Adding a Widget](adding-a-widget.md) — Create a new widget
- [Architecture Overview](../architecture/overview.md) — How it all fits together
