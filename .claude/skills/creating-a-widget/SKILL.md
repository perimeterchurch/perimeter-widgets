---
name: creating-a-widget
description: Use when building or adding a new Perimeter embeddable widget (or a new widget-backing API endpoint) in perimeter-widgets — orchestrates MP schema discovery, the perimeter-api endpoint, api-hooks type regen, scaffolding, styling, testing, and release.
---

# Creating a Widget — End-to-End Orchestrator

A **map, not a manual.** This skill sequences the full path from idea → MP data →
perimeter-api endpoint → typed hook → scaffolded widget → styled → tested →
released. Each step links the single source of truth (an MDX guide that humans
read at `style.perimeter.org/guides`, or an existing skill) — follow the link
rather than re-deriving anything here.

All paths are absolute from the workspace root
`/Users/parkerb/dev/perimeter/claude/`. Run pnpm commands (never npm/npx). Work
on a feature branch off `dev`; never commit to `dev` or `main`.

## 1. Clarify the widget

Pin down what it shows, whether it is **public** or **authenticated**, and which
Ministry Platform data it needs. This decision drives everything downstream:
public vs authenticated picks the perimeter-api route group, and the data shape
determines the endpoint and the hook.

## 2. Discover the data

Find the MP tables and columns that back the widget before writing any query.

- Invoke the **`discover-mp-schema`** skill to run `mp-explore` from perimeter-api
  (positional table name, `--top N` for row count, `--filter` for the table
  list — unknown flags are silently ignored).
- Confirm every column you plan to select/filter with the
  **`verify-mp-columns-against-live-schema`** skill (MP is Pascal_Case with
  underscores; a wrong column returns plausible-but-wrong data).
- Reference: `perimeter-widgets/docs/guides-mdx/data-and-api.mdx`
  (live: `/guides/data-and-api`). The full `mp-explore` command reference is the
  **`mp-explorer`** skill.

## 3. Endpoint (perimeter-api)

Check whether perimeter-api already exposes the data — look for an existing
endpoint and a matching hook in `perimeter-widgets/packages/api-hooks/src/`. If
one exists, skip to step 4.

If not, build it in perimeter-api following **its own** rules — read
`/Users/parkerb/dev/perimeter/claude/perimeter-api/CLAUDE.md` for the layered
anatomy (route → Controller → Service → System → models/transformers + an
`openapi/registry/<domain>.ts` entry) and its critical MP rules. The
cross-repo data seam is summarized in
`perimeter-widgets/docs/guides-mdx/data-and-api.mdx`.

Then regenerate the spec + types in perimeter-api:

```bash
pnpm generate:spec:types   # run in perimeter-api; commits openapi/spec.yaml
```

## 4. Regenerate types + add the hook

Pull perimeter-api's spec into `@perimeter/api-hooks` and regenerate the
operation types:

```bash
pnpm --filter @perimeter/api-hooks sync
```

Then hand-write the hook at
`perimeter-widgets/packages/api-hooks/src/<domain>/use-<thing>.ts` and export it
from the package index, following the existing pattern (e.g.
`packages/api-hooks/src/sermons/use-books.ts`). The pattern and the
`operations['<operationId>']` typing are documented in the data/API guide
(`docs/guides-mdx/data-and-api.mdx`).

## 5. Scaffold

Generate the widget from the template:

```bash
pnpm create-widget <name>          # kebab-case; scaffolds widgets/<name>/
```

Commit the lockfile change it produces, then run the dev loop in the studio
(`pnpm dev`) and iterate against the live preview.

## 6. Style

Style tokens-first with the design system: reach for `@perimeter/ui` components
and `@perimeter/theme` tokens before custom CSS. Guide:
`perimeter-widgets/docs/guides-mdx/styling-widgets.mdx` (live:
`/guides/styling-widgets`); the full token reference is the studio `/tokens`
page.

## 7. Test + quality gate

Write the widget's tests (render guard + bundle budget come scaffolded), then:

```bash
pnpm format && pnpm quality
```

**Turbo-cache gotcha:** a green local `pnpm quality` can be a turbo cache
replay — the tests may not have actually run. To prove the CI-bound gate, force
a fresh run:

```bash
pnpm exec turbo run test --force
```

## 8. Release

Ship with the one-command release (bumps the version, builds, commits on a
`release/<name>-<version>` branch, pushes, and opens the PR to `dev`):

```bash
pnpm release <name> --patch    # or --minor | --major
```

Production updates flow `dev → main` via the batched, user-initiated release PR
(never a per-widget push to `main`). Full release/rollback mechanics:
`perimeter-widgets/docs/hosting-and-release.md` and
`perimeter-widgets/docs/creating-a-widget.md` (the end-to-end build guide:
`docs/guides-mdx/building-a-widget-end-to-end.mdx`, live:
`/guides/building-a-widget-end-to-end`).
