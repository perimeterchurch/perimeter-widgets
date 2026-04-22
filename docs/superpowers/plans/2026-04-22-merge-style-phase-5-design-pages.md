# Merge Style — Phase 5: Design System Pages Implementation Plan

**Goal:** Add a multi-page `/design/*` section to the site covering colors, typography, spacing, borders, and branding. Redirect the existing `/tokens` route into `/design/colors` so existing links still work.

**Architecture:** Each sub-page is its own route under `apps/site/src/app/design/`. `/design/colors` reuses the existing `TokenPageClient` + `TOKEN_GROUPS` infrastructure that already powers `/tokens`. Typography/spacing/borders are defined in-page from the Tailwind v4 scale values visible in `apps/site/src/app/globals.css` (no new data pipeline needed). Branding uses placeholder assets under `apps/site/public/brand/` until real marks are filed.

**Spec:** `docs/superpowers/specs/2026-04-20-merge-style-into-widgets-design.md`

**Branch:** `feat/design-system-pages` off `dev`.

## File Map

| Action | File                                           | Notes                                                                               |
| ------ | ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| Create | `apps/site/src/app/design/page.tsx`            | Landing — grid of cards linking to each sub-page                                    |
| Create | `apps/site/src/app/design/colors/page.tsx`     | Reuses existing `TokenPageClient` and reads `packages/registry/themes/default.json` |
| Create | `apps/site/src/app/design/typography/page.tsx` | Font families, type scale samples (Tailwind default), line-height, tracking         |
| Create | `apps/site/src/app/design/spacing/page.tsx`    | Tailwind spacing scale visualized (0–96)                                            |
| Create | `apps/site/src/app/design/borders/page.tsx`    | Radius scale (`--radius-sm` → `--radius-4xl`), border widths, shadows               |
| Create | `apps/site/src/app/design/branding/page.tsx`   | Logo marks (placeholder), brand color palette, usage guidelines                     |
| Create | `apps/site/public/brand/README.md`             | Placeholder — real brand marks are filed separately                                 |
| Modify | `apps/site/src/app/tokens/page.tsx`            | Replace body with `redirect('/design/colors')`                                      |
| Modify | `apps/site/src/components/site/top-nav.tsx`    | Replace "Tokens" link with "Design" → `/design`                                     |
| Modify | `apps/site/src/app/page.tsx`                   | (Optional) home-page card for /design — leave alone if it's not a concern           |

## Execution

1. Create the six `/design/*` pages
2. Create branding placeholder asset directory
3. Replace `/tokens` body with a redirect
4. Update top-nav
5. `pnpm -w install`, `pnpm -w build`, `pnpm -w quality`
6. Manual smoke: click through `/design`, each sub-page, redirect from `/tokens`
7. Commit + push + PR

## Notes / deferred

- Real brand mark assets (primary, white, mono SVGs) are not included — placeholder only. Filed as a follow-up (low-urgency).
- Spacing page shows Tailwind defaults; if the project ever defines custom spacing tokens, this page can be updated to read from `globals.css` the way `/design/colors` reads theme JSON.
- Borders page reads radius values from the CSS variable definitions in `globals.css`; border widths + shadows shown as Tailwind defaults.
