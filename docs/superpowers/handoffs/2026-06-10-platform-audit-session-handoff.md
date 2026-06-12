# Dark-theme fix + platform tooling audit & roadmap execution — Session Handoff (2026-06-10)

> Snapshot for resuming in a new session. **Everything in this session is MERGED to `dev`
> (PRs #116–#122), all branches are deleted, local `dev` is synced and clean.** There is no
> in-flight work — this handoff is context, decisions, and pick-up points, not a task list.

## What shipped (all merged to `dev`)

| PR | What | Notes |
| --- | --- | --- |
| #116 | **Sermons dark-theme fix** — `:host` is now a themed SURFACE | Root cause: the token sheet defined only CSS variables on `:host` — no background paint, and host-page `color`/`font-size` inherited through the shadow boundary (host-sim: `#353535`/19px). Dark mode rendered dark-token elements over the host's light backdrop. Fix in `resolveTokens` (`packages/theme/src/resolver.ts`): `:host` paints `background-color`/`color`/`font-family`/`font-size`/`line-height` + per-theme `color-scheme`. Behavior note: light mode is now an opaque white surface (was transparent). Guards: `packages/theme/tests/resolver-surface.test.ts`, `studio/visual/host-surface.spec.ts`. |
| #117 | **Platform tooling audit** (report + roadmap) | `docs/superpowers/audits/2026-06-10-platform-tooling-audit.md`. Method: codebase audit + two adversarially-verified deep-research rounds (46 sources, 50 claims 3-vote verified) + targeted follow-up. |
| #118 | **WP Rocket hardening** | `data-nowprocket` on every documented embed snippet + "Caching & Optimization Plugins" section in `docs/reference/embed-guide.md` + loader.js usage comment. Docs-only. |
| #119 | **axe-core a11y sweep** + real contrast fix | `studio/visual/a11y-axe.spec.ts` (wcag2a/aa, both themes, scoped to the preview host; waits for entrance fades — axe composites mid-fade opacity into measured colors → phantom failures). Real finding: light `color-muted-fg` failed AA (~4.3:1) on muted surfaces → darkened 47%→44%, pinned by `packages/theme/tests/contrast.test.ts`. |
| #120 | **DTCG 2025.10 token export** | `packages/theme/src/dtcg.ts` + committed `tokens.dtcg.json` + root `pnpm tokens:dtcg`; sync-guard test fails `pnpm quality` on drift. Light/dark as plain top-level groups (Resolver-module theming not yet supported by flagship tooling). Adopted because Figma collaboration is plausible within a year (user). |
| #121 | **Shadow + type-scale tokens** | `shadow-xs…xl` (light = Tailwind defaults, dark = same geometry at higher opacity) and `text-xs…xl` (px) join the `data-theme-*` contract, the Tailwind preset (`boxShadow`/`fontSize` with unitless line-heights), the theme editor, the tokens page, and the DTCG export. `:host` font-size is now `var(--text-base)`. Spacing tokens deliberately SKIPPED (per-embed spacing override breaks layouts). Also hardened the visual harness (see gotchas). |
| #122 | **Stranded-PR recovery** | #120/#121 were stacked PRs (bases = parent feature branches); merging them in place sent the work into already-merged parents, not `dev`. #122 re-landed both. |

## Audit verdicts (LOCKED — don't relitigate)

- **Keep the custom studio.** No maintained Storybook shadow-DOM pattern exists for React stories (npm sweep + GitHub issues verified); Ladle is commit-silent in 2026; Histoire dropped React. The studio is ahead of the ecosystem for the shadow-root + adoptedStyleSheets requirement.
- **Keep Turborepo** (no Nx), **keep IIFE + `mount()`** (Stripe Elements precedent), **keep React 19** (preact/compat has no React 19 support — preactjs#4613), **keep CSS-variable tokens** (Tailwind v4 canonical; "tokens-as-data is best practice" was refuted 0-3 under adversarial verification).
- Full citations + scorecard + watch items: `docs/superpowers/audits/2026-06-10-platform-tooling-audit.md`.

## Deferred (user decisions, revisit AFTER the WordPress cutover)

1. **Changesets evaluation** — version-intent/changelog automation feeding the committed-cdn publish step.
2. **loader.js evergreen-API decision doc** — bless loader + manifest as the public embed contract with rollback/canary semantics.
3. **Visual-regression spike** — Playwright `toHaveScreenshot` (Docker baselines) vs Argos free tier; NO vendor has verified shadow-DOM rendering fidelity, so spike before buying.

## Standing constraints

- **Sermons release is ON HOLD** (user may do more widget work). Everything above reaches widgets.perimeter.org only via `pnpm release sermons --patch` — prod serves committed `cdn/` bundles, not source. The release backlog now includes: dark-theme surface fix, muted-fg contrast fix, shadow/type tokens.
- **Never base a PR on another feature branch** — `--base dev` always (the #120/#121 stranding; same lesson hit helpdesk #147 the same day). For dependent work: hold the second PR until the first merges, or combine.

## Gotchas learned this session (encoded in code/tests, recorded here for context)

- **Visual-suite flake class (pre-existing, now fixed):** the full Playwright suite flaked ~1-in-2 under parallel workers — late preview remounts (theme toggles remount the widget) raced one-shot reads. Confirmed at baseline via stash runs before blaming new work. Hardening: `openShadowMenu` re-waits for a vanished trigger, `readMenuComputedColor` retries the whole open+read cycle, responsive spec polls conditions. 5 consecutive clean 27/27 runs after. If a visual spec flakes again, fix the read pattern (poll/retry), not the assertion.
- **axe + framer-motion:** run axe only after entrance animations settle; mid-fade ancestor opacity is composited into axe's measured foreground colors, producing contrast "violations" with colors that exist on no settled frame.
- **Studio persists the canvas theme** — fresh Playwright probes can load already-dark; set the theme explicitly before reading computed styles.

## Pick-up points for the next session

- More **sermons widget work** (the user's stated reason for holding the release), then cut `pnpm release sermons --patch` when ready — verify dark theme + the new tokens render on the host-sim canvas before shipping.
- **WordPress cutover** remains owner-driven (runbook: `docs/superpowers/plans/2026-06-01-…phase-4-cutover.md`); the embed snippet now carries `data-nowprocket` — use the updated `docs/reference/embed-guide.md` snippet verbatim.
- The three deferred audit items above, when invited.
- Optional follow-up: the audit's "watch" list (DTCG toolchain maturity, custom-element embed surface, declarative adoptedStyleSheets, Storybook shadow-DOM support) — re-check in ~6–12 months.
