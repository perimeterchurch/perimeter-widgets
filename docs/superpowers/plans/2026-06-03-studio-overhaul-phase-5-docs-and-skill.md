# Studio Overhaul Phase 5 — Docs + `creating-a-widget` Skill Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the overhaul — delete the pre-streamline stale docs, rewrite the two CLAUDE.md files to the current shape, author the MDX guides that are the single source of truth for humans **and** Claude (building, styling, data/API, testing, releasing), document the remaining `@perimeter/ui` components, and ship the end-to-end **`creating-a-widget`** Claude skill that orchestrates the full path: MP schema discovery → a new perimeter-api endpoint → regenerated `@perimeter/api-hooks` types → `pnpm create-widget` → style with the design system → test → `pnpm release`.

**Architecture:** Docs are single-sourced MDX under `docs/` (Phase 3 renders them at the studio's `/guides` and `/components` routes; the same files Claude reads as markdown). The skill is a **thin orchestrator** at `perimeter-widgets/.claude/skills/creating-a-widget/SKILL.md` (a project-level skill that loads when working in perimeter-widgets — see the discovery note below): it sequences the steps and links the MDX guides + the existing MP skills (`discover-mp-schema`, `verify-mp-columns-against-live-schema`) + perimeter-api's own CLAUDE.md, rather than duplicating any of them. **No production/widget code changes** — this phase is docs, content, one skill file, and **one studio change**: extending the MDX component-scope map (`studio/src/lib/mdx.tsx`) so newly-documented components render in their `<Example>` blocks (Task 5).

**Tech Stack:** Markdown/MDX, the Phase-3 studio MDX pipeline (guides in `docs/guides-mdx/`, component docs in `docs/components/`, both rendered with live `<Example>` blocks via `ComponentStage`), Claude Code skill format (frontmatter `name`+`description`). Spec: `docs/superpowers/specs/2026-06-02-studio-design-system-dx-overhaul-design.md` (Phase 5 section).

**Branch / stacking:** This phase builds on Phase 4 (PR #84 — `pnpm create-widget`, the one-command `pnpm release`, and the Phase-4 rewrite of `docs/creating-a-widget.md`). **Branch off `feat/dx-tooling`** (not `origin/dev`) so those commands and that doc are present; the Phase-5 PR targets `feat/dx-tooling` with a "merge #84 first" note (land-stacked-prs). If #84 has already merged to `origin/dev` by the time you start, branch off `origin/dev` and target `dev` instead (Task 1 detects which).

---

## Context for a zero-context engineer

The perimeter-widgets platform after Phases 1–4: a single `mount()` shadow-DOM render path (dev studio == production), a polished routed Vite studio that is also the deployed design-system site (style.perimeter.org), `pnpm create-widget <name>` to scaffold and `pnpm release <name> --patch|--minor|--major` to ship. Widgets get their data from **perimeter-api** (a separate Next.js project at `/Users/parkerb/dev/perimeter/claude/perimeter-api`, prod `https://api.perimeter.org`) via typed React Query hooks in `@perimeter/api-hooks`.

**The cross-repo data seam (verified — the skill's hardest part):**
1. perimeter-api exposes endpoints via a layered DI architecture: `route.ts` (in a `(public)`/`(authenticated)` route group) → `Controller` → `Service` → `System` (the only layer touching the MP provider) → `data/models` (zod schemas) + `data/transformers` + an `openapi/registry/<domain>.ts` entry. Its MP access is `this.provider.tables.list('<Table>', { filter, select, orderby, top })` with OData filters (single quotes, Pascal_Case columns). Full anatomy + critical rules live in **`perimeter-api/CLAUDE.md`** and its `docs/`.
2. perimeter-api regenerates its spec + types with `pnpm generate:spec:types` → commits `perimeter-api/openapi/spec.yaml`.
3. perimeter-widgets pulls that spec and regenerates operation types with **`pnpm --filter @perimeter/api-hooks sync`** (copies `../../../perimeter-api/openapi/spec.yaml` → `spec/spec.yaml`, then `openapi-typescript` → `src/generated/operations.ts`).
4. You then hand-write a hook in `packages/api-hooks/src/<domain>/use-<thing>.ts` following the existing pattern (verified in `src/sermons/use-books.ts`): `operations['<operationId>']` for param/response types, `useQuery` + `useApiClient()` + `fetchJson`/`serializeQuery`. Export it from the package index.

**Existing MP skills the new skill must REUSE (not duplicate):** `discover-mp-schema` (running `mp-explore` from a sibling project, with the exact flag gotchas — positional table name, `--top`, `--filter`, unknown flags silently ignored) and `verify-mp-columns-against-live-schema` (confirming columns before trusting a query). Both at `/Users/parkerb/dev/perimeter/claude/.claude/skills/`. Also `mp-explorer.md` (the full command reference).

**Skill format** (match `/.claude/skills/mp-explorer.md`): a file with YAML frontmatter `name:` + `description:` (the description is the trigger — write it so Claude invokes it when asked to build/add a widget), then markdown. Directory form `creating-a-widget/SKILL.md` is the convention for skills that may carry reference files.

**Docs inventory (audited 2026-06-03) — disposition per file:**
- **DELETE (pre-streamline, superseded):** `docs/architecture/vite-preset.md` (described the old preset), `docs/guides/adding-a-widget.md` (superseded by the Phase-4 `docs/creating-a-widget.md`), `docs/reference/design-tokens.md` (describes Tailwind-v4 `@theme` + Storybook + `packages/shared/` — all removed; replaced by the live `/tokens` page + a new tokens guide), `docs/architecture/shared-package.md` (`packages/shared` no longer exists).
- **AUDIT then fix-or-delete:** `docs/architecture/overview.md`, `docs/architecture/cdn-deployment.md` (likely superseded by `docs/hosting-and-release.md` + `docs/deploying.md`), `docs/reference/embed-guide.md` (vs `hosting-and-release.md`), `docs/guides/{authentication,developer-rules,developer-setup,testing}.md` (some may be current, some pre-streamline), `docs/widgets/sermons.md` (has a stale "Campus ID Mapping" section to remove), `docs/README.md` (the index — must point at the current docs + the studio).
- **KEEP (current, Phase 1–4 outputs):** `docs/creating-a-widget.md`, `docs/hosting-and-release.md`, `docs/deploying.md`, `docs/deploying-studio.md`, the `docs/components/*.mdx` (3 seeds), `docs/guides-mdx/styling-widgets.mdx`, everything under `docs/superpowers/**` (history — never touch).

**Root workspace CLAUDE.md is stale (confirmed):** `/Users/parkerb/dev/perimeter/claude/CLAUDE.md` line 12 still describes perimeter-widgets as "the 56-component shadcn registry (`packages/registry/`) and the Next.js showcase site (`apps/site/` → style.perimeter.org)" + "jsDelivr" — all removed in the streamline. Must be rewritten to the current shape.

Repo rules: pnpm only; never commit to `dev`/`main`; conventional commits (`docs:`/`chore:`/`feat:`); `pnpm format` before `pnpm quality`. **The entire `docs/` tree is in `.prettierignore`** (a bare `docs` entry, no un-ignore) — so `pnpm format`/`format:check` do NOT touch any authored `.md`/`.mdx`; the **only** gate proving MDX validity is the studio build `pnpm --filter @perimeter/studio build` (and, for component docs, a render check — see Task 5). Don't assume formatting ran on docs. (The studio code change in Task 5, `studio/src/lib/mdx.tsx`, IS formatted/linted/typechecked normally.) PR bodies via the Write tool + `gh pr create --body-file`.

**Skill discovery (verify, don't assume):** project-level `.claude/skills/` are discovered relative to the active project, not aggregated to the workspace parent — so a skill at `perimeter-widgets/.claude/skills/creating-a-widget/SKILL.md` should load when working in perimeter-widgets (exactly when it's wanted), but this is NOT the same mechanism as `mp-explorer.md` (which lives in the workspace `.claude/skills/`). Tasks 6–7 include an explicit load-check; if it does not appear in the available-skills list, the fallback is to place it in the workspace `/Users/parkerb/dev/perimeter/claude/.claude/skills/creating-a-widget/SKILL.md` instead.

---

## Chunk 1: Stale-doc cleanup + CLAUDE.md rewrites

### Task 1: Branch + delete superseded docs + fix the survivors

**Files:** delete 4 confirmed-stale docs; fix `docs/widgets/sermons.md`, `docs/README.md`; audit the "audit" set

- [ ] **Step 1: Branch.** `git fetch --prune`. If `git log --oneline origin/dev | grep -q "create-widget"` (Phase 4 merged), `git checkout -B feat/docs-and-skill origin/dev` (PR will target `dev`). Else `git checkout -B feat/docs-and-skill feat/dx-tooling` (stacked; PR targets `feat/dx-tooling`, note "merge #84 first"). Record which base you used.
- [ ] **Step 2: Delete the 4 confirmed-superseded docs:** `git rm docs/architecture/vite-preset.md docs/guides/adding-a-widget.md docs/reference/design-tokens.md docs/architecture/shared-package.md`. (Inbound-link reconciliation happens in Step 3b, AFTER the audit-set keep/delete decisions — because a surviving audit-set file may link to one of these.)
- [ ] **Step 3: Audit the "audit" set.** Read each of `docs/architecture/overview.md`, `docs/architecture/cdn-deployment.md`, `docs/reference/embed-guide.md`, `docs/guides/{authentication,developer-rules,developer-setup,testing}.md`. For each, decide DELETE (fully superseded by a Phase 1–4 doc) or FIX (update stale specifics: `packages/shared`→current packages, jsDelivr→`widgets.perimeter.org`, Tailwind v4→v3, Storybook/storyboard→studio, `@perimeter-widgets/`→`@perimeter/`, `createWidgetConfig`/`vite-preset`→`widgetConfig`). Apply the decision. Record the per-file disposition in your report. When in doubt, FIX with a pointer to the canonical doc rather than delete. **Note from audit:** `cdn-deployment.md` and `embed-guide.md` already read as current thin redirects to `hosting-and-release.md`/`developer-rules.md` — likely KEEP/light-fix, not delete; `overview.md`, `developer-setup.md`, `testing.md`, `authentication.md` carry stale `packages/shared`/Storybook/vite-preset specifics — FIX or delete.
- [ ] **Step 3b: Reconcile inbound links AFTER the keep/delete decisions are final.** `grep -rn "vite-preset\|adding-a-widget\|design-tokens\|shared-package" docs --include=*.md --include=*.mdx` and fix every reference in a SURVIVING file (known offenders: `docs/widgets/sermons.md` links `adding-a-widget.md`; `developer-rules.md`, `developer-setup.md`, `testing.md`, `authentication.md`, `overview.md` reference delete targets). No surviving doc may link to a deleted file.
- [ ] **Step 4: Fix `docs/widgets/sermons.md`** — remove the stale "Campus ID Mapping" section (and any other streamline-stale specifics); leave the rest.
- [ ] **Step 5: Rewrite `docs/README.md`** as the current docs index: group into Getting started (`creating-a-widget.md` + the studio), Guides (`docs/guides-mdx/*` — note they also render at style.perimeter.org/guides), Reference (components at /components, tokens at /tokens), Hosting/release (`hosting-and-release.md`, `deploying.md`, `deploying-studio.md`), and Architecture (the survivors). No links to deleted files.
- [ ] **Step 6: Verify + commit.** `grep -rn "packages/registry\|apps/site\|jsDelivr\|packages/shared\|storybook\|storyboard\|@theme\|@perimeter-widgets/\|createWidgetConfig\|vite-preset" docs --include=*.md --include=*.mdx | grep -v superpowers/` should return nothing (superpowers history is exempt). Also confirm no surviving doc links to a deleted file (Step 3b). (`pnpm format` is a no-op on docs — they're prettier-ignored — so no formatting step needed here.) Commit: `docs(widgets): remove pre-streamline docs, refresh index + sermons`.

### Task 2: Rewrite both CLAUDE.md files

**Files:** `/Users/parkerb/dev/perimeter/claude/CLAUDE.md` (root workspace), `/Users/parkerb/dev/perimeter/claude/perimeter-widgets/CLAUDE.md`

- [ ] **Step 1: Root workspace CLAUDE.md** — rewrite ONLY the `perimeter-widgets` table row (line ~12) to the current shape. Replace the "56-component shadcn registry (`packages/registry/`) and the Next.js showcase site (`apps/site/`) … jsDelivr" description with: a Turborepo monorepo of embeddable shadow-DOM React widgets on a single `mount()` path; the `@perimeter/ui` component library + `@perimeter/theme` tokens; a Vite **studio** that is both the dev harness and the deployed design-system site (style.perimeter.org); static `cdn/` hosting at `widgets.perimeter.org` with `pnpm release`; `pnpm create-widget` to scaffold. Keep the row's format consistent with the other rows. Do NOT touch other projects' rows.
- [ ] **Step 2: perimeter-widgets/CLAUDE.md** — restructure as a lean index (it currently carries the full phase-by-phase streamline history). Keep: a one-paragraph "what this is", the packages table (ensure it lists the CURRENT packages — `theme`, `widget-runtime`, `vite-plugin-widget`, `auth`, `api-client`, `api-hooks`, `ui`, `release`, `parity`, plus the `studio/` app — verify against `ls packages` + `pnpm-workspace.yaml`), the commands table (add `create-widget` + the `release --patch|minor|major` form + the api-hooks `sync`), the critical rules, and a **doc pointers** section linking the canonical docs (`creating-a-widget.md`, `hosting-and-release.md`, `deploying-studio.md`, the guides) and the `creating-a-widget` skill. MOVE the phase-by-phase narrative/history to the existing handoff doc (`docs/superpowers/2026-06-02-session-handoff.md`) or a brief "History" pointer — don't delete the information, relocate it. Verify every command and path you cite actually exists.
- [ ] **Step 2b:** Re-read the **root** CLAUDE.md's cross-project rules section: if it references widgets specifics that changed (e.g. jsDelivr publish flow), fix those too. Otherwise leave it.
- [ ] **Step 3: Verify + commit.** Confirm no stale tokens remain (`grep -n "registry\|apps/site\|jsDelivr\|showcase\|56-component" CLAUDE.md` at repo root and in perimeter-widgets/CLAUDE.md → only intentional mentions, if any). `pnpm format`. Commit: `docs: refresh root + widgets CLAUDE.md to the post-overhaul shape`.

---

## Chunk 2: MDX guides + component docs (the knowledge Claude needs)

All guides live in `docs/guides-mdx/` (render at the studio `/guides/<slug>`). Write real, accurate, concise content — verified against the actual code/commands, not aspirational. Each guide may use `<Example>` blocks (the Phase-3 MDX component that renders live in a `ComponentStage`). After authoring any MDX, run `pnpm --filter @perimeter/studio build` — a build failure means the MDX is malformed.

### Task 3: `building-a-widget-end-to-end.mdx`

**Files:** Create `docs/guides-mdx/building-a-widget-end-to-end.mdx`

- [ ] **Step 1:** Author the narrative spine that ties the whole platform together (this is the human-readable companion to the skill). Sections: (1) `pnpm create-widget <name>` and what it scaffolds; (2) the widget anatomy (`widget.tsx` defineWidget schema/auth/App, `entry.ts`, `styles.css`, `data-*` config contract with the `z.coerce.*` requirement and why — cite the parity finding); (3) the dev loop (`pnpm --filter @perimeter/studio dev`, the studio canvas/host-sim, HMR); (4) getting data (link to the data-and-api guide); (5) styling (link to the styling guide); (6) testing (link); (7) releasing (`pnpm release <name> --patch`, link to hosting-and-release). Keep each section tight with real commands. Cross-link the other guides by their `/guides/<slug>` paths.
- [ ] **Step 2:** `pnpm --filter @perimeter/studio build` succeeds (MDX valid). Confirm the guide appears in the studio sidebar (Phase 3's `listGuides()` auto-discovers `docs/guides-mdx/*`). Commit: `docs(guides): end-to-end widget build guide`.

### Task 4: `data-and-api.mdx` + expand `styling-widgets.mdx`

**Files:** Create `docs/guides-mdx/data-and-api.mdx`; expand `docs/guides-mdx/styling-widgets.mdx`

- [ ] **Step 1: `data-and-api.mdx`** — the cross-repo data guide (the hardest knowledge, mirrored by the skill). Sections, all verified against the real seam:
  - **Discover the data in MP:** use `mp-explore` (cite the canonical invocation + the flag gotchas, and link the `discover-mp-schema` skill); verify columns before trusting them (link `verify-mp-columns-against-live-schema`).
  - **Does an endpoint already exist?** Check `perimeter-api/openapi/spec.yaml` / the existing `@perimeter/api-hooks` hooks first.
  - **Build a new perimeter-api endpoint:** the layered path (route group → controller → service → system → models/transformers → `openapi/registry/<domain>.ts`), `this.provider.tables.list(...)` with OData, the critical rules (resolveUserId, no `dp_Users` columns, Luxon dates, single-quote filters) — but DEFER the depth to `perimeter-api/CLAUDE.md` (link it, don't reproduce it). Then `pnpm generate:spec:types` in perimeter-api.
  - **Regenerate widget types:** `pnpm --filter @perimeter/api-hooks sync` → write a hook in `packages/api-hooks/src/<domain>/use-<thing>.ts` following the `use-books.ts` pattern (show the real skeleton: `operations['<operationId>']`, `useQuery`, `useApiClient`, `fetchJson`/`serializeQuery`), export from the index.
  - **Consume in the widget:** call the hook inside the widget App (it's already inside the runtime's QueryProvider + ApiClient context); auth seam note (`mpp-widgets_AuthToken`); dev points at `https://api.perimeter.org` by default (or local `:5500` — cite the `__PERIMETER_API_URL__` global override).
- [ ] **Step 2: Expand `styling-widgets.mdx`** (Phase 3 seeded it) — round it out: tokens-first (link `/tokens`), the `@perimeter/ui` components (link `/components`), the rem→px + shadow-DOM + host-inheritance facts from the parity work (what the studio host-sim shows you), per-embed overrides (`data-theme-*`), and the H6 lesson (use `z.coerce.*` in schemas). Add at least one `<Example>`.
- [ ] **Step 3:** `pnpm --filter @perimeter/studio build` succeeds. Commit: `docs(guides): data/API cross-repo guide + expanded styling guide`.

### Task 5: Remaining component docs + components overview

**Files:** Modify `studio/src/lib/mdx.tsx` (extend the component-scope map); create `docs/components/<name>.mdx` for the interactive components; create `docs/guides-mdx/components.mdx` (overview); modify `studio/src/pages/ComponentPage.test.tsx` (render checks)

**Critical mechanism:** an `<Example>` block in a component doc references components by **bare JSX** (e.g. `<Combobox …/>`), which MDX resolves at RENDER time from the `mdxComponents` scope map in `studio/src/lib/mdx.tsx`. That map currently provides only Badge/Button/Card* (its own comment says "Extend this map as docs land for more components (Phase 5)"). So a new doc whose `<Example>` uses an unmapped component will **build fine but throw at render** ("Expected component `X` to be defined"). Therefore this task MUST extend the map, and the build alone is NOT sufficient proof — a render check is required.

- [ ] **Step 1: Extend the scope map.** In `studio/src/lib/mdx.tsx`, import and register every component you're about to document (Input, Textarea, Label, Combobox, MultiCombobox, SortSelect, IconSelect, Tabs/TabsList/TabsTrigger/TabsContent, Pagination, InputGroup, Empty — match the real export names from `packages/ui/src/*`) into `mdxComponents`. This is the one studio code change this phase makes; it's typechecked/linted normally.
- [ ] **Step 2: Failing render check.** Add cases to `studio/src/pages/ComponentPage.test.tsx` (happy-dom, the Phase-3 precedent — it currently only renders `button`/`spinner`) that render a couple of the newly-documented component routes (e.g. `input`, `tabs`) and assert the doc content + a live `<Example>` element appears (NOT a thrown "Expected component … to be defined"). Run `pnpm exec turbo run test --filter=@perimeter/studio --force` → FAIL (docs/map not there yet).
- [ ] **Step 3: Author the docs.** Concise `.mdx` for the interactive/prop-driven components not yet documented: `input`, `textarea`, `label`, `combobox`, `multi-combobox`, `sort-select`, `icon-select`, `tabs`, `pagination`, `input-group`, `empty`. Read each component's real props first; each = one-line purpose + a working `<Example>` (props filled so it renders) + a short props list. The purely-presentational ones (`spinner`, `skeleton`, `skeleton-transition`) stay on the gallery fallback — note that in the overview rather than forcing thin docs.
- [ ] **Step 4:** `docs/guides-mdx/components.mdx` overview: how components render inside widgets (shadow DOM + tokens), how to compose them, the link to `/components/<name>`, and the coverage note (documented vs gallery-only).
- [ ] **Step 5:** Run `pnpm exec turbo run test --filter=@perimeter/studio --force` → PASS (the render checks now resolve), and `pnpm --filter @perimeter/studio build` → succeeds. Commit: `feat(studio): document interactive ui components (mdx scope + docs + overview)`.

---

## Chunk 3: The `creating-a-widget` skill + finalize

### Task 6: The `creating-a-widget` skill

**Files:** Create `perimeter-widgets/.claude/skills/creating-a-widget/SKILL.md`

- [ ] **Step 1:** Author the skill as a **thin orchestrator** (it sequences + links; it does NOT duplicate the guides or the MP skills). Frontmatter: `name: creating-a-widget`; `description:` a trigger written for invocation — e.g. "Use when building or adding a new Perimeter embeddable widget (or a new widget-backing API endpoint) — orchestrates MP schema discovery, the perimeter-api endpoint, api-hooks type regen, scaffolding, styling, testing, and release." Body = a numbered checklist, each step linking the canonical source:
  1. **Clarify the widget** — what it shows, public vs authenticated, what MP data it needs.
  2. **Discover the data** — invoke the `discover-mp-schema` skill (mp-explore) + `verify-mp-columns-against-live-schema`; link `docs/guides-mdx/data-and-api.mdx`.
  3. **Endpoint** — check for an existing endpoint/hook; if none, build one in perimeter-api following **its** CLAUDE.md (link the absolute path) + the data-and-api guide; `pnpm generate:spec:types` there.
  4. **Regenerate types** — `pnpm --filter @perimeter/api-hooks sync`, then add the `use-<thing>` hook (pattern in the guide).
  5. **Scaffold** — `pnpm create-widget <name>`; dev loop in the studio.
  6. **Style** — `docs/guides-mdx/styling-widgets.mdx`, tokens-first, `@perimeter/ui`.
  7. **Test + quality** — widget tests; `pnpm format && pnpm quality`; the turbo `--force` gotcha (link `feedback_turbo_cache_masks_tests` knowledge / state it).
  8. **Release** — `pnpm release <name> --patch|--minor|--major` (opens the PR); promote via dev→main; rollback note.
  Each step: one short paragraph + the exact command + the link. Keep the whole skill scannable (it's a map, not a manual).
- [ ] **Step 2: Verify the skill's references resolve** — every command exists (`create-widget`, `release --patch`, `api-hooks sync`, `generate:spec:types`), every linked doc path exists (the guides from Chunk 2, `perimeter-api/CLAUDE.md`), every referenced skill name is real (`discover-mp-schema`, `verify-mp-columns-against-live-schema`, `mp-explorer`). Fix any broken reference.
- [ ] **Step 3: Load-check (the highest-risk item).** Confirm the skill actually loads, not just that the file exists: from a fresh check with CWD in perimeter-widgets, verify `creating-a-widget` appears in the available-skills list (project-level skills load relative to the active project). If it does NOT appear, move it to the workspace skills dir `/Users/parkerb/dev/perimeter/claude/.claude/skills/creating-a-widget/SKILL.md` (mp-explorer's proven location) and re-check. Record which location loaded in your report.
- [ ] **Step 4: Commit:** `feat(skill): end-to-end creating-a-widget orchestrator skill`.

### Task 7: Finalize — gate, cross-check, PR

- [ ] **Step 1: Whole-phase consistency pass.** Re-grep the non-superpowers docs for any stale token (`packages/registry`, `apps/site`, `jsDelivr`, `packages/shared`, `storybook`, Tailwind-`@theme`) → none. Confirm every internal doc link resolves (no link to a deleted file). Confirm the skill's links resolve.
- [ ] **Step 2: Full gate.** `pnpm format`, then `pnpm exec turbo run typecheck lint test --filter=@perimeter/studio --filter=@perimeter/release --force` (the `--force` defeats turbo cache replays — the studio render checks from Task 5 must actually run), then `pnpm quality` (whole workspace), and `pnpm --filter @perimeter/studio build` (proves all new MDX renders). All green. `git status` clean.
- [ ] **Step 3: PR.** Push `feat/docs-and-skill`. Write the PR body with the Write tool (the deletions, the CLAUDE.md rewrites, the new guides + component docs, the skill, and how to invoke it) and `gh pr create --body-file …`. Base = `dev` if Task 1 branched from origin/dev, else `feat/dx-tooling` with a "merge #84 first" note (land-stacked-prs). Do NOT merge.
- [ ] **Step 4:** Report the PR URL + the per-file disposition table from Task 1 Step 3 + confirmation the studio build renders every new guide/component doc.

---

## Execution notes

- Tasks are sequential (shared tree). Chunk 2's guides are linked by the Chunk 3 skill, so author them first.
- This phase is docs + one skill + **one studio change** (the `studio/src/lib/mdx.tsx` component-scope map in Task 5) — **no widget/runtime/bundle/release-tooling code changes**, so no production-bundle impact. The gates are the studio render checks (Task 5), the studio build (MDX validity), and the quality gate.
- The skill is a thin orchestrator on purpose: it must not duplicate `perimeter-api/CLAUDE.md`, the MP skills, or the guides — it links them. If a step needs depth, the depth lives in a guide or the linked CLAUDE.md, and the skill points there.
- Out of scope: the owner-driven style.perimeter.org Vercel project creation + DNS (Phase 3 runbook, `docs/deploying-studio.md`); any new endpoint/widget (the skill describes how, this phase doesn't build one); the `spinner`/`skeleton`/`skeleton-transition` component docs (gallery fallback is fine — noted in the components overview).
- After this phase the overhaul is complete: parity (1–2), studio + site (3), DX commands (4), docs + skill (5). A final `dev → main` release ships everything.
