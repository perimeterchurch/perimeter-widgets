# Decision: changesets — deferred (re-evaluate on scale triggers)

**Date:** 2026-06-11
**Status:** Deferred
**Origin:** 2026-06-10 platform tooling audit, roadmap item 5 (deferred item 1). The
audit verified (9-0) that changesets is the standard versioning layer Turborepo
itself delegates to, and that adapting it here would mean wiring its
version/changelog phases to the committed-`cdn/` publish step.

## Verdict

Do not adopt at current scale. The machinery's two big wins — npm publish
automation and multi-package dependency bumps across many consumers — don't apply:
nothing here publishes to npm (the publish step is the custom committed-CDN
pipeline either way), and there are two widgets with one maintainer. What remains
is changelog generation, and per-PR changeset intent files are a standing tax on
every PR (bot nags included) to get it.

Version intent stays where it is today: decided at release time via
`pnpm release <name> --patch|--minor|--major`, with conventional commits as the
release narrative (the batched dev→main release PR already groups them by type).

## Re-evaluation triggers

Adopt (prototype `changeset version` + changelog feeding the existing publish
step) when either holds:

- a second regular contributor lands widget PRs, or
- the widget count reaches ~4+, when "which changes are in this release" stops
  being obvious from the git log.

Cheaper intermediate if changelogs become wanted before then: generate a
`CHANGELOG.md` section from conventional commits inside `pnpm release` (S effort,
no per-PR workflow change).
