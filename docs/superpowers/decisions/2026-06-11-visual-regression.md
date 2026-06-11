# Decision: visual regression — Playwright `toHaveScreenshot` now, Argos at the CI trigger

**Date:** 2026-06-11
**Status:** Adopted (Playwright-native half); Argos deferred with trigger
**Origin:** 2026-06-10 platform tooling audit, roadmap item 4 (deferred item 3). The
audit found no vendor with verified shadow-DOM rendering fidelity and recommended an
empirical spike before buying anything.

## Spike results (run 2026-06-11)

Setup: `studio/visual/screenshot-baselines.spec.ts` — sermons widget, light + dark,
captured off the same `[data-perimeter-widget-preview]` shadow host the rest of the
harness drives, against the mocked API.

1. **Shadow-DOM fidelity: confirmed for our stack.** Playwright screenshots the
   composited page, so shadow-root content renders exactly as shipped. The audit's
   fidelity concern applies to *re-rendering* vendors (Chromatic rebuilds stories in
   its own infra); it dissolves for both options here — Argos also diffs screenshots
   *we* capture.
2. **Stability: clean.** 6+ consecutive runs pixel-identical on the dev Mac (mocked
   API, deterministic fixture PNG, fonts awaited, framer-motion fades settled,
   `animations: 'disabled'`).
3. **Detection: proven, with a sharp edge.** A real, clearly visible perturbation
   (italicizing every card title) moved only **~400 pixels** past the per-pixel
   color threshold. A plausible-looking `maxDiffPixelRatio: 0.001` (~2,300 px of
   this capture) **silently passed it**. Ratios scale the allowance with capture
   size and quietly swallow small-area regressions — typography and small-control
   changes are exactly that class. The spec therefore uses an absolute
   `maxDiffPixels: 100`, which failed the perturbation in both themes and passed
   cleanly after revert.

## Decision

- **Adopt** the Playwright-native baseline spec, baselines committed to the repo.
  The visual suite runs locally only (CI runs `pnpm quality`, not Playwright), so
  Darwin baselines generated on the dev Mac are correct by construction — the
  audit's Docker/Linux baseline cost only exists once visuals run in CI.
- **Tolerance rule for future specs:** absolute `maxDiffPixels`, never
  `maxDiffPixelRatio` (finding 3).
- Intentional visual changes regenerate baselines:
  `pnpm --filter @perimeter/studio visual -- --update-snapshots`, and the baseline
  diff rides the same PR as the change that caused it.

## Argos: deferred, with trigger

Argos (free 5k screenshots/mo, reporter drops into the existing suite) earns its
keep through PR-time review UI and cross-environment baseline hosting. Neither
exists as a need while the visual suite is local-only. **Trigger:** when the
Playwright visual suite is added to CI, adopt Argos (or regenerate baselines in
Docker) at that moment rather than maintaining per-platform committed baselines —
revisit this doc then.
