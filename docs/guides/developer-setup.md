# Developer Setup

> **Scope:** Local environment, pnpm, the Vite studio, dev commands
> **Key files:** `package.json`, `turbo.json`, `pnpm-workspace.yaml`, `studio/`

---

## Prerequisites

| Tool    | Version       | Notes                                                      |
| ------- | ------------- | ---------------------------------------------------------- |
| Node.js | 22+           | `engines.node` is `>=22`                                   |
| pnpm    | 10 (`10.32.1`) | Pinned via `packageManager`; `corepack enable` picks it up |

Always use `pnpm` — never `npm` or `npx`.

---

## Getting Started

```bash
# Clone the repository
git clone <repo-url> && cd perimeter-widgets

# Install dependencies
pnpm install

# Start the Vite studio (dev harness + design-system site)
pnpm dev
```

---

## Dev Commands

| Command                                          | Description                                            |
| ------------------------------------------------ | ------------------------------------------------------ |
| `pnpm dev`                                        | Run dev tasks across the workspace (Vite studio + widget watches) |
| `pnpm build`                                      | Build all packages and widgets via Turborepo           |
| `pnpm --filter @perimeter/widget-sermons build`   | Build a single widget                                  |
| `pnpm --filter @perimeter/studio build`           | Build the studio (the MDX validity gate for docs)      |
| `pnpm test`                                       | Run all tests via Turborepo                            |
| `pnpm test --filter=@perimeter/widget-sermons`    | Run tests for a single widget                          |
| `pnpm lint`                                       | ESLint across all packages                             |
| `pnpm typecheck`                                  | TypeScript type checking                               |
| `pnpm format`                                     | Auto-format with Prettier                              |
| `pnpm quality`                                    | Run all gates (typecheck + lint + test + `format:check`) |
| `pnpm create-widget <name>`                       | Scaffold a new widget                                  |
| `pnpm release <name> --patch\|--minor\|--major`   | Bump, build, publish to `cdn/`, and open a PR          |

---

## The studio

`pnpm dev` starts the Vite studio (`studio/`) — one app that is both the local dev harness and the deployed read-only design-system site at `style.perimeter.org`. It auto-discovers widgets via `import.meta.glob('/widgets/*/src/widget.tsx')` and `@perimeter/ui` components, and previews everything through the real `mount()` path inside a shadow root, so what you see is what production renders.

Routes: `/` (overview), `/widgets/:slug`, `/components/:name`, `/tokens`, `/guides/:slug`. The component, token, and guide pages render the single-sourced MDX under `docs/`. A dev-only **source ⇄ built-bundle** toggle (gated behind `import.meta.env.DEV`) mounts the actual `widgets/<name>/dist/index.js` for a final pre-release check; it is tree-shaken out of the deployed site.

### Data and images in dev

For previews that need real data (and the images those records reference), run the local **perimeter-api** alongside the studio:

```bash
# In the sibling perimeter-api project
cd perimeter-api && pnpm dev   # serves on :5500
```

In dev (`import.meta.env.DEV`) the studio targets `http://localhost:5500` automatically via two independent knobs, so no manual config is needed:

- **Data** — `WidgetPreview` passes `apiBaseUrl: 'http://localhost:5500'` into `mount()`, so the React Query hooks fetch from the local API.
- **Images** — `studio/.env.development` sets `VITE_API_URL=http://localhost:5500`, which `lib/format.ts` reads (`import.meta.env.VITE_API_URL`) to build absolute `<img>` URLs.

Both are **dev-only**: Vite loads `.env.development` only in serve/dev mode, and the `apiBaseUrl` is gated behind `import.meta.env.DEV`, so the deployed `style.perimeter.org` build never bakes in `localhost:5500` — the production studio falls back to `https://api.perimeter.org`. The studio still launches without perimeter-api running; data-backed previews just error or stay empty until it is up.

---

## The auth shell (`studio-host`)

`studio-host/` is a thin **Next.js** app that becomes the deployed `style.perimeter.org`. It gates the studio behind Ministry Platform login (restricted to MP roles **Administrators** and **Website Folder - Edit**) and serves the Vite-built studio (`studio/dist`) as static assets. Auth is Better Auth + MP OIDC, cookie-backed (no database); the gate reads the OIDC `roles` claim — see `docs/superpowers/plans/2026-08-10-studio-mp-auth-wall.md`.

**The Vite studio and its test/visual suites are unchanged and _ungated_.** `pnpm dev` (Vite, `:5173`) and the Playwright suites (which target `:5173`) never go through the wall — it lives only in the shell. Develop the studio exactly as before; only run the shell when you need to exercise auth.

Run the gated experience locally:

```bash
# 1. Build the studio (Node <22.18 needs the strip-types flag — see below).
NODE_OPTIONS=--experimental-strip-types pnpm --filter @perimeter/studio build
# 2. Copy the build into the shell and start it.
pnpm --filter @perimeter/studio-host embed
pnpm --filter @perimeter/studio-host dev        # Next shell on http://localhost:5273
```

`pnpm --filter @perimeter/studio-host build` chains all three (studio build → embed → `next build`) via its `prebuild` hook. Copy `studio-host/.env.local.example` → `.env.local` and fill in `BETTER_AUTH_SECRET` + the MP client creds first. Note: MP only has `http://localhost:5173/api/auth/oauth2/callback/ministryplatform` registered, so a full interactive login needs either that callback registered for `:5273` or the shell run on `:5173`.

> **`NODE_OPTIONS=--experimental-strip-types`** — on Node < 22.18 the studio build (and its vitest) fail with `ERR_UNKNOWN_FILE_EXTENSION ".ts"` from `@perimeter/vite-plugin-widget`. Set that flag (or use Node ≥ 22.18) when building or testing the studio.

---

## Building Widgets

```bash
# Build all widgets + packages
pnpm build

# Build a specific widget
pnpm --filter @perimeter/widget-sermons build

# Output: widgets/<name>/dist/index.js — a single self-contained IIFE
```

Each widget builds to its own `widgets/<name>/dist/index.js`. `pnpm release <name> --patch|--minor|--major` copies that immutable artifact into `cdn/<name>/<version>/index.js` (committed there) and updates `cdn/manifest.json`; the static `cdn/` Vercel project at `widgets.perimeter.org` serves it. The per-widget `dist/` is just a build artifact — it is not the serving source.

---

## Related Docs

- [Developer Rules](developer-rules.md) — Git workflow, conventions
- [Creating a widget](../creating-a-widget.md) — Scaffold and build a new widget
- [Architecture Overview](../architecture/overview.md) — How it all fits together
