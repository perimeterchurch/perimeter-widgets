# Developer Setup

> **Scope:** Local environment, pnpm, dev server, storyboard, Storybook
> **Key files:** `package.json`, `turbo.json`, `pnpm-workspace.yaml`
> **Last verified:** 2026-03-17

---

## Prerequisites

| Tool    | Version | Notes                                                      |
| ------- | ------- | ---------------------------------------------------------- |
| Node.js | 20+     | Project tested against v25                                 |
| pnpm    | 10+     | Install: `corepack enable && corepack prepare pnpm@latest` |

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

| Command                              | Description                                       |
| ------------------------------------ | ------------------------------------------------- |
| `pnpm dev`                           | Start widget storyboard on port 5180              |
| `pnpm storybook`                     | Start shared component Storybook on port 6006     |
| `pnpm build`                         | Build all widgets to `dist/`                      |
| `pnpm build --filter=widget-sermons` | Build a single widget                             |
| `pnpm test`                          | Run all tests via Turborepo                       |
| `pnpm test --filter=widget-sermons`  | Run tests for a single widget                     |
| `pnpm lint`                          | ESLint across all packages                        |
| `pnpm typecheck`                     | TypeScript type checking                          |
| `pnpm format`                        | Auto-format with Prettier                         |
| `pnpm quality`                       | Run all checks (typecheck + lint + format + test) |

---

## Storyboard

The storyboard (`packages/storyboard/`) is a custom Vite dev app for previewing full widgets in their shadow DOM containers.

- Runs on `http://localhost:5180`
- Widget registry with status indicators (ready/skeleton/planned)
- Live config editor — change data attributes and see the widget re-mount instantly
- Auto-generated embed code snippets for WordPress
- MSW (Mock Service Worker) intercepts API calls — no real API needed
- Widgets render inside shadow DOM exactly as they would on WordPress

### Using a real local API

By default the storyboard uses MSW mocks. To test against a real perimeter-api running locally:

```bash
VITE_API_MODE=local pnpm dev
```

Or add to `.env.local`:

```
VITE_API_MODE=local
VITE_API_URL=http://localhost:5500
```

---

## Storybook

Storybook v10 (`packages/shared/.storybook/`) is for developing and documenting shared UI components in isolation.

- Runs on `http://localhost:6006`
- Stories co-located with components (`Button.stories.tsx` next to `Button.tsx`)
- Tailwind design tokens loaded in preview
- Controls, viewport, and other essentials built into Storybook v10 core

---

## Environment Variables

Copy the example file: `cp .env.example .env.local`

| Variable        | Default                                           | Description                         |
| --------------- | ------------------------------------------------- | ----------------------------------- |
| `VITE_API_URL`  | auto (localhost:5500 dev, api.perimeter.org prod) | API base URL                        |
| `VITE_API_MODE` | `mock`                                            | `mock` or `local` — storyboard only |

Convention: `VITE_<DOMAIN>_<NAME>`. See `env.d.ts` for type definitions.

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
