# Merge Style — Phase 6: Vercel Cutover + Archive Old Repo Implementation Plan

**Goal:** Point `style.perimeter.org` at `apps/site` inside this monorepo, retire the standalone `style/` repo and its Vercel project, and clean up references to the split across both the widgets repo's CLAUDE.md and the parent `claude/` workspace.

**Architecture:** Two categories of work. **Mechanical** (this PR): update CLAUDE.md in both the widgets repo and the parent workspace, and land a runbook for the cutover. **Operator-driven** (you): repoint the Vercel project, smoke-test, archive the old GitHub repo, and remove the `style/` directory from the local `claude/` workspace.

**Spec:** `docs/superpowers/specs/2026-04-20-merge-style-into-widgets-design.md`

**Branch:** `feat/style-cutover` off `dev`.

## This PR adds / changes

| Action | File | Notes |
| --- | --- | --- |
| Modify | `CLAUDE.md` (perimeter-widgets root) | Add a short "Deployment" subsection pointing at `style.perimeter.org` |
| Modify | `../CLAUDE.md` (parent `claude/` workspace) | Drop the `style/` row from the project table; update the `perimeter-widgets/` description to reflect merged showcase + registry + widget preview + design; drop `style` from the `quality.sh` list in the cross-project section |
| Create | `docs/superpowers/plans/2026-04-22-merge-style-phase-6-cutover.md` | This plan — doubles as the operator runbook |

No `vercel.json` is committed. Vercel auto-detects Next.js + pnpm workspaces from a `Root Directory = apps/site` setting and requires no file-level config for the static-export build. Any future overrides go in `apps/site/vercel.json` when needed.

## Operator checklist (developer-driven — runs after this PR merges)

Cutover is safe to do at your own pace. Until you flip the Vercel project, the old `style/` repo keeps serving `style.perimeter.org`; after the flip, the new `apps/site` serves it. External consumers (metrics, perimeter-api) use the same URL both ways, so nothing downstream needs coordination.

### 1. Cutover Vercel

In the Vercel dashboard → `style.perimeter.org` project (or create a new project pointing at the `perimeterchurch/perimeter-widgets` repo):

- **Root directory:** `apps/site`
- **Framework preset:** Next.js (auto-detected)
- **Install command:** `pnpm install` from the monorepo root (Vercel handles pnpm workspaces automatically when the repo's root `pnpm-workspace.yaml` is visible)
- **Build command:** `pnpm --filter @perimeter-widgets/site build` (or leave as auto-detected `next build` — the site's `package.json build` script runs the full chain anyway)
- **Output directory:** `out` (relative to the `apps/site` root directory Vercel was pointed at)
- **Environment variables:** set `NEXT_PUBLIC_API_URL=https://api.perimeter.org` (the default the code already uses, but making it explicit in Vercel makes future tweaks visible)
- **Production branch:** `main`
- **Preview deploys:** `dev` + PR branches (optional, matches the current style project setup)

### 2. Smoke-test the new deployment

After the first production deploy finishes, verify the cutover points:

```bash
# Registry JSON still served at the same URLs consumers installed from
curl -sfI https://style.perimeter.org/r/button.json
curl -sfI https://style.perimeter.org/r/default-theme.json

# Scratch consumer install still works
mkdir /tmp/scratch-install && cd /tmp/scratch-install && pnpm init -y
pnpm dlx shadcn@latest add https://style.perimeter.org/r/button.json
ls src/components/ui/button.tsx  # → exists

# Widget preview + live embed flow
open https://style.perimeter.org/widgets/sermons

# Design pages + components showcase
open https://style.perimeter.org/design
open https://style.perimeter.org/components/actions/button
```

### 3. Confirm downstream consumers still build

```bash
(cd ../metrics && pnpm build)
(cd ../perimeter-api && pnpm build)
pnpm --filter @perimeter-widgets/widget-sermons build
```

All three should produce identical output to what they produced before Phase 6.

### 4. Archive the old `style/` GitHub repo

1. On GitHub: `perimeterchurch/style` → Settings → scroll to bottom → "Archive this repository" → confirm.
2. Disable the Vercel project that used to deploy the standalone style repo (Vercel → old project → Settings → Delete Project, or pause auto-deploy).
3. Optional: add a README note at the top of the archived repo pointing at this monorepo's `packages/registry/` and `apps/site/` as its successor.

### 5. Remove local `style/` directory from the `claude/` workspace

```bash
cd /Users/parkerb/dev/perimeter/claude
# Double-check there are no un-pushed local changes you need first
(cd style && git status && git log origin/dev..HEAD)

# If clean:
rm -rf style
```

The `claude/` workspace's CLAUDE.md has already been updated by this PR to drop the `style/` row, so this step just removes the on-disk directory.

## Post-cutover state

- `style.perimeter.org` serves from `apps/site` in this monorepo
- `perimeterchurch/style` repo archived (read-only)
- `claude/` workspace has 4 projects instead of 5 (`perimeter-api`, `perimeter-widgets`, `metrics`, `mp-explorer`)
- All external consumers (metrics, perimeter-api, any other projects using `@perimeter/*` via the shadcn registry) continue to install from the same URL with no changes
- The refactor is complete.
