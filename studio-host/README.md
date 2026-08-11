# @perimeter/studio-host

The Next.js **shell** that will become the `style.perimeter.org` deployment. It
serves the Vite-built studio (`studio/dist`) as static assets and (in later
tasks) gates access behind Ministry Platform auth, restricted to MP roles
**2 (Administrators)** / **237 (Website Folder - Edit)**.

Plan: [`docs/superpowers/plans/2026-08-10-studio-mp-auth-wall.md`](../docs/superpowers/plans/2026-08-10-studio-mp-auth-wall.md) (Option C).

## How it serves the studio

`scripts/embed-studio.mjs` copies `studio/dist` → `studio-host/public`. `next.config.ts`
adds a `beforeFiles` SPA-fallback rewrite so `/` and client routes (`/tokens`,
`/components/*`, `/guides/*`) render the studio's `index.html`, while real assets
(`/assets/*`, files with extensions), `/_next/*`, and `/api/*` pass through.

`public/` is build output and is gitignored.

## Task status

- **1.0 (this):** shell scaffolded; serves the Vite build with SPA fallback.
- **1.1–1.4 (next):** Better Auth + MP OIDC, Next middleware gate, claim-based
  role check, `/signin` + `/unauthorized`.

## Local dev

```bash
# Build the studio first (Node <22.18 needs the strip-types flag — see repo CLAUDE.md).
NODE_OPTIONS=--experimental-strip-types pnpm --filter @perimeter/studio build
pnpm --filter @perimeter/studio-host embed   # copy dist -> public
pnpm --filter @perimeter/studio-host dev      # Next shell on http://localhost:5273
```

`pnpm --filter @perimeter/studio-host build` runs all three (studio build →
embed → `next build`) via the `prebuild` hook.

Port **5273** (studio Vite 5173, perimeter-api 5500, Metrics 5600, KB 5700).

> The plain Vite studio (`pnpm dev`, port 5173) and its Playwright/visual
> suites are unchanged and ungated — the wall lives only in this shell.
