# Studio Overhaul Phase 4 — DX Tooling Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two developer-experience commands, both in the existing `@perimeter/release` package: `pnpm create-widget <name>` scaffolds a correct new widget from a template (no more copy-the-example), and `pnpm release <name> --patch|--minor|--major` bumps the version itself, builds, updates `cdn/`, then commits on a release branch, pushes, and opens the PR into `dev` — you just merge.

**Architecture:** Both commands are thin CLIs over **pure, unit-tested core functions** (name validation, template rendering, semver bump, branch name, PR body) plus a small side-effect layer (fs writes, `execSync` for git/gh/pnpm). The scaffolder renders real template files in `packages/release/templates/widget/` (with `__NAME__` substitution) — templates live outside the package's `src`/`tests` so they're never linted/typechecked and are invisible to the pnpm workspace. The release command extends `packages/release/src/cli.ts`: a bare `pnpm release <name>` keeps today's exact behavior (version as-is, commit only, no push/PR — used by the batched flow); a `--patch|--minor|--major` flag adds the bump + branch + push + PR. A `--dry-run` prints the planned branch/commit/PR without any git/gh side effects, so CI and the execution workflow can verify the orchestration without ever pushing.

**Tech Stack:** TypeScript, tsx, vitest, Node `fs`/`child_process`, `gh` CLI. Inputs: the existing `packages/release/src/{cli.ts,release.ts}` (read them — they already do build→copy→manifest→rewrites→prune→commit) and the reference widget `widgets/example/` (the template's source of truth). Spec: `docs/superpowers/specs/2026-06-02-studio-design-system-dx-overhaul-design.md` (Phase 4 section). Builds on merged Phases 1–3.

---

## Context for a zero-context engineer

How releasing works **today** (`packages/release/src/cli.ts`, invoked by the root script `"release": "tsx packages/release/src/cli.ts"`):

`pnpm release <name> [--force]` → reads `widgets/<name>/package.json` version (must already be set by hand), refuses if `cdn/<name>/<version>/` exists (immutable) unless `--force`, then: `pnpm --filter @perimeter/widget-<name> build` → copy `dist/index.js`(+`.map`) to `cdn/<name>/<version>/` → `setManifestVersion` in `cdn/manifest.json` → `buildRewrites` into `cdn/vercel.json` → `versionsToPrune` to keep the last 5 → `git add cdn && git commit -m "chore(release): <name>@<version>"`. It does **not** push or open a PR (a human does). The pure helpers (`setManifestVersion`, `buildRewrites`, `versionsToPrune`, `compareVersions`, `bundleRelPath`) live in `packages/release/src/release.ts` and are unit-tested in `tests/release.test.ts` — **follow that split**: pure logic in `release.ts`, side effects in the CLI.

A widget's anatomy (template source = `widgets/example/`, verified):
- `package.json`: name `@perimeter/widget-<name>`, `"version": "0.0.0"`, `private`, `type: module`, `exports` → `./src/widget.tsx`, scripts `dev`(`vite build --watch`)/`build`(`vite build`)/`lint`(`eslint src tests`)/`typecheck`(`tsc --noEmit`)/`test`(`vitest run`), deps `@perimeter/{theme,ui,widget-runtime}` + react/react-dom/zod, devDeps incl. `@perimeter/vite-plugin-widget`, testing-library, vitest, **jsdom** (widgets test under jsdom; only `widget-runtime` uses happy-dom), tailwindcss/postcss/autoprefixer, typescript, vite.
- `vite.config.ts`: `export default defineConfig(widgetConfig({ name: '<name>' }))`.
- `tailwind.config.ts`: `presets:[preset], content: widgetContent` (from `@perimeter/theme/tailwind` — the Phase-2 H2 fix; `widgetContent` already scans `packages/ui/src`).
- `tsconfig.json`: extends `../../tsconfig.base.json`, `include:["src/**/*","tests/**/*"]`.
- `vitest.config.ts`: jsdom, `tests/**/*.test.{ts,tsx}`, setup `./tests/setup.ts`.
- `src/`: `widget.tsx` (`defineWidget({ name, auth, schema, App })`), `app.tsx`, `entry.ts` (imports `./styles.css?inline`, `widget.version = __PERIMETER_WIDGET_VERSION__`, `ensureGlobal`+`autoMount`), `styles.css` (three `@tailwind` directives), `env.d.ts` (`vite/client` + `declare const __PERIMETER_WIDGET_VERSION__: string`).
- `tests/`: `setup.ts` (jest-dom + RTL cleanup), `app.test.tsx`, `bundle.test.ts` (builds, asserts single IIFE, CSS inlined, name+`PerimeterWidgets` global present).

The workspace globs `widgets/*` + `packages/*` (`pnpm-workspace.yaml`), so a new `widgets/<name>/` is picked up after `pnpm install` with no manifest edit. `templates/` under `packages/release/` is NOT globbed (only `packages/*`, i.e. the package dirs themselves) and is outside the package's tsconfig `include` (`src`/`tests` only) and eslint scope (`eslint src tests`) — so template files with `__NAME__` placeholders are never compiled, linted, or seen as a workspace package. Confirm these facts hold before relying on them.

Repo rules: pnpm only; never commit to `dev`/`main` (work on `feat/dx-tooling`); conventional commits; `pnpm format` before `pnpm quality`; verify with `pnpm exec turbo run test --filter=@perimeter/release --force`. **CRITICAL for this phase:** the release command can push and open PRs — tests and the execution workflow must NEVER trigger a real push/PR. Exercise the orchestration only via `--dry-run` and pure-function unit tests. The one authorized push is the final Phase-4 PR task. PR bodies via the Write tool + `gh pr create --body-file`.

---

## Chunk 1: `pnpm create-widget <name>` scaffolder

### Task 1: Branch + pure core — name validation & template rendering

**Files:** Create `packages/release/src/scaffold.ts`; test `packages/release/tests/scaffold.test.ts`

- [ ] **Step 1:** `git fetch --prune && git checkout -B feat/dx-tooling origin/dev`. Baseline: `pnpm install` then `pnpm exec turbo run test --filter=@perimeter/release --force` (green).
- [ ] **Step 2: Failing test** (`scaffold.test.ts`) — drive the pure functions, no filesystem:

```ts
import { describe, it, expect } from 'vitest';
import { validateWidgetName, renderTemplate } from '../src/scaffold';

describe('validateWidgetName', () => {
  it('accepts kebab-case names', () => {
    expect(validateWidgetName('event-list', [])).toEqual({ ok: true });
  });
  it('rejects non-kebab, uppercase, leading/trailing/double dashes, and empties', () => {
    for (const bad of ['Event', 'event_list', 'event--list', '-x', 'x-', '', 'a b'])
      expect(validateWidgetName(bad, []).ok).toBe(false);
  });
  it('rejects an existing widget name', () => {
    expect(validateWidgetName('example', ['example', 'sermons']).ok).toBe(false);
  });
});

describe('renderTemplate', () => {
  it('substitutes __NAME__ everywhere and yields the widget file set', () => {
    const files = renderTemplate('event-list', { 'package.json': '{"name":"@perimeter/widget-__NAME__"}', 'src/widget.tsx': "name: '__NAME__'" });
    expect(files['package.json']).toContain('@perimeter/widget-event-list');
    expect(files['src/widget.tsx']).toContain("name: 'event-list'");
    // every placeholder gone
    for (const c of Object.values(files)) expect(c).not.toContain('__NAME__');
  });
});
```

- [ ] **Step 3:** Run `pnpm exec turbo run test --filter=@perimeter/release --force` → FAIL.
- [ ] **Step 4: Implement** `scaffold.ts` (pure only — no fs/exec here):

```ts
export interface ValidationResult { ok: boolean; reason?: string }

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** A widget name must be kebab-case and not already taken. */
export function validateWidgetName(name: string, existing: string[]): ValidationResult {
  if (!KEBAB.test(name)) return { ok: false, reason: `"${name}" must be kebab-case (e.g. event-list)` };
  if (existing.includes(name)) return { ok: false, reason: `widgets/${name} already exists` };
  return { ok: true };
}

/** Substitute __NAME__ in every template file's contents. Pure: takes the raw
 * template map (relPath → contents), returns the rendered map. */
export function renderTemplate(name: string, template: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [rel, contents] of Object.entries(template)) {
    out[rel] = contents.replaceAll('__NAME__', name);
  }
  return out;
}
```

- [ ] **Step 5:** Run tests → PASS.
- [ ] **Step 6: Commit:** `feat(release): pure widget-name validation + template rendering`. (Include `pnpm-lock.yaml` if Step 1's install changed it.)

### Task 2: The widget template files

**Files:** Create `packages/release/templates/widget/**` — the full file set with `__NAME__` placeholders, mirroring `widgets/example/` exactly except the name and a minimal starter App/schema.

- [ ] **Step 1:** Read every file under `widgets/example/` (src, tests, configs, package.json — NOT `dist`/`.turbo`/`tsconfig.tsbuildinfo`). For each, create the template equivalent under `packages/release/templates/widget/`, replacing the literal `example` widget-name occurrences with `__NAME__`:
  - `package.json` → name `@perimeter/widget-__NAME__`, **`"version": "0.0.0"`**, copy scripts + deps + devDeps verbatim from example.
  - `vite.config.ts` → `widgetConfig({ name: '__NAME__' })`.
  - `tailwind.config.ts`, `tsconfig.json`, `vitest.config.ts` → verbatim copies (no name inside).
  - `src/widget.tsx` → `defineWidget({ name: '__NAME__', auth: 'none', schema: z.object({ title: z.string().default('__NAME__') }), App: ({config}) => <App config={config} /> })` — a minimal but real starter (note `z.coerce.*` for any numeric/boolean fields in a comment, since the studio/prod parity depends on it).
  - `src/app.tsx` → a tiny starter rendering the `title` inside a `@perimeter/ui` `Card` (so the new widget is immediately non-empty and dogfoods the design system).
  - `src/entry.ts`, `src/styles.css`, `src/env.d.ts` → verbatim (entry.ts has no literal name — it imports `./widget`).
  - `tests/setup.ts` → verbatim. `tests/app.test.tsx` → a starter test **rewritten** to match the starter App (the example test asserts `count`-driven `level:3` headings, which the single-`title` starter App doesn't have — write a test that asserts the title renders). `tests/bundle.test.ts` → copy example's, replacing `toContain('example')` → `toContain('__NAME__')` but **keeping** the `toContain('PerimeterWidgets')` assertion.

Note on the hand-written starter files (`app.tsx`, `widget.tsx`, `app.test.tsx`): the `tsconfig.base.json` has `exactOptionalPropertyTypes: true` — account for it on any optional props.
- [ ] **Step 2:** Store the doc stub too: `packages/release/templates/widget/docs/widget.mdx` (rendered later to `docs/widgets/<name>.mdx`) — a short starter: title, what the widget does (TODO), the embed snippet with `__NAME__`, and a `<!-- author the rest; see /guides -->` pointer.
- [ ] **Step 3: Verify templates are inert AND prettier-clean.** Confirm `packages/release/tsconfig.json` `include` is `["src/**/*","tests/**/*"]` (templates excluded) and the lint script is `eslint src tests` (templates excluded), and `pnpm-workspace.yaml` does not glob `packages/release/templates`. **`templates/` is NOT in `.prettierignore`, so the `pnpm quality` gate's `prettier --check .` WILL check every template file** (placeholders sit in string/identifier positions so they parse fine, but they must be formatted). Run `pnpm format` now (formats the templates), then `pnpm exec turbo run typecheck lint --filter=@perimeter/release --force` → green, then `pnpm prettier --check packages/release/templates` → clean. (Authoring verbatim-from-example gets the configs formatted; the hand-written starter `app.tsx`/`widget.tsx`/`app.test.tsx`/`widget.mdx` are the ones `pnpm format` will touch.)
- [ ] **Step 4: Commit:** `feat(release): widget scaffold template`.

### Task 3: `create-widget` CLI + wire `pnpm create-widget`

**Files:** Create `packages/release/src/create-cli.ts`; create `packages/release/src/scaffold-fs.ts` (the fs/exec layer); modify root `package.json` (script); test `packages/release/tests/scaffold-fs.test.ts`

- [ ] **Step 1: Failing integration test** (`scaffold-fs.test.ts`) — render the real template into an **OS temp dir** (never `widgets/`), assert structure + substitution, and that no `__NAME__` survives. Build is NOT run in CI (workspace deps don't resolve outside the monorepo) — that's the manual smoke in Step 6.

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadWidgetTemplate, writeScaffold } from '../src/scaffold-fs';

let dir: string | null = null;
afterEach(() => { if (dir) rmSync(dir, { recursive: true, force: true }); dir = null; });

describe('scaffold to disk', () => {
  it('writes the rendered template with no placeholders left', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'wscaf-'));
    const target = path.join(dir, 'event-list');
    writeScaffold(target, 'event-list', loadWidgetTemplate());
    expect(existsSync(path.join(target, 'package.json'))).toBe(true);
    expect(existsSync(path.join(target, 'src/widget.tsx'))).toBe(true);
    expect(JSON.parse(readFileSync(path.join(target, 'package.json'), 'utf8')).name)
      .toBe('@perimeter/widget-event-list');
    // recursively assert no file contains __NAME__
    const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
    for (const f of walk(target)) expect(readFileSync(f, 'utf8')).not.toContain('__NAME__');
  });
});
```

- [ ] **Step 2:** Run → FAIL (modules missing).
- [ ] **Step 3: Implement** `scaffold-fs.ts`: `loadWidgetTemplate()` reads `packages/release/templates/widget/**` (recursive `readdirSync`) into a `Record<relPath, contents>` (resolve the templates dir from `import.meta.url`); `writeScaffold(targetDir, name, template)` = `renderTemplate(name, template)` (from `scaffold.ts`) then `mkdirSync`+`writeFileSync` each file (creating parent dirs), and renders the `docs/widget.mdx` entry to the repo's `docs/widgets/<name>.mdx` only when writing into the real `widgets/` tree (the CLI passes that; the temp-dir test writes the widget files but the CLI handles the docs placement — keep `writeScaffold` widget-files-only, and let the CLI place the doc, so the test stays hermetic).
- [ ] **Step 4: Implement** `create-cli.ts`: read `name` from `process.argv[2]`; list existing widgets (`readdirSync(REPO/widgets)`); `validateWidgetName` → exit with the reason if invalid; `writeScaffold(REPO/widgets/<name>, name, loadWidgetTemplate())`; write `docs/widgets/<name>.mdx` from the doc template; run `pnpm install` (`execSync`, so the workspace + node_modules pick it up); print next steps (start studio: `pnpm --filter @perimeter/studio dev`; the widget is at `widgets/<name>`; its doc at `docs/widgets/<name>.mdx`; **commit the updated `pnpm-lock.yaml`** so the later `release` clean-tree guard isn't tripped; run `pnpm format && pnpm quality`).
- [ ] **Step 5:** Add to root `package.json` scripts: `"create-widget": "tsx packages/release/src/create-cli.ts"`. Run the integration test → PASS.
- [ ] **Step 6: Manual smoke (real, then revert):** `pnpm create-widget demo-widget` → creates `widgets/demo-widget`; `pnpm --filter @perimeter/widget-demo-widget build` succeeds and emits a single IIFE; `pnpm --filter @perimeter/widget-demo-widget test` passes. Then **remove it** (`git clean`/`rm -rf widgets/demo-widget docs/widgets/demo-widget.mdx`, restore `pnpm-lock.yaml`/`pnpm install`) so nothing scaffolded is committed. Record the smoke result in your report; commit ONLY the tooling.
- [ ] **Step 7: Quality + commit:** `pnpm format && pnpm exec turbo run typecheck lint test --filter=@perimeter/release --force`. Commit: `feat(release): pnpm create-widget scaffolder`.

---

## Chunk 2: `pnpm release <name> --patch|--minor|--major`

### Task 4: Pure release-flow helpers — bump, branch, PR body

**Files:** Modify `packages/release/src/release.ts` (add helpers); test additions in `packages/release/tests/release.test.ts`

- [ ] **Step 1: Failing tests** (append to `release.test.ts`):

```ts
import { nextVersion, releaseBranch, releasePrBody } from '../src/release';

describe('nextVersion', () => {
  it('bumps patch/minor/major and zeroes lower parts', () => {
    expect(nextVersion('1.2.3', 'patch')).toBe('1.2.4');
    expect(nextVersion('1.2.3', 'minor')).toBe('1.3.0');
    expect(nextVersion('1.2.3', 'major')).toBe('2.0.0');
  });
  it('drops a prerelease suffix when bumping', () => {
    expect(nextVersion('1.2.0-abc', 'patch')).toBe('1.2.1');
  });
  it('throws on a non-numeric version', () => {
    expect(() => nextVersion('x.y.z', 'patch')).toThrow();
  });
});

describe('releaseBranch', () => {
  it('is deterministic and git-ref-safe', () => {
    expect(releaseBranch('event-list', '1.3.0')).toBe('release/event-list-1.3.0');
  });
});

describe('releasePrBody', () => {
  it('includes name, version, and bundle size', () => {
    const body = releasePrBody({ name: 'sermons', version: '1.0.2', gzBytes: 864400 });
    expect(body).toContain('sermons@1.0.2');
    expect(body).toMatch(/844(\.\d+)?\s*KiB|864400/); // size shown in some human form
  });
});
```

- [ ] **Step 2:** Run `pnpm exec turbo run test --filter=@perimeter/release --force` → FAIL.
- [ ] **Step 3: Implement** in `release.ts`:

```ts
export type BumpLevel = 'patch' | 'minor' | 'major';

/** Bump a semver core (drops any prerelease). Throws on a non-numeric version. */
export function nextVersion(current: string, level: BumpLevel): string {
  const core = current.split('-')[0]!;
  const parts = core.split('.').map((n) => Number.parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`cannot bump non-semver version: "${current}"`);
  }
  let [maj, min, pat] = parts as [number, number, number];
  if (level === 'major') { maj += 1; min = 0; pat = 0; }
  else if (level === 'minor') { min += 1; pat = 0; }
  else { pat += 1; }
  return `${maj}.${min}.${pat}`;
}

export function releaseBranch(name: string, version: string): string {
  return `release/${name}-${version}`;
}

export interface ReleasePrInput { name: string; version: string; gzBytes?: number | undefined }
export function releasePrBody(input: ReleasePrInput): string {
  const size = input.gzBytes != null ? `${(input.gzBytes / 1024).toFixed(1)} KiB gz` : 'n/a';
  return [
    `## Release ${input.name}@${input.version}`,
    '',
    `Built widget bundle published to \`cdn/${input.name}/${input.version}/\`, manifest + \`latest.js\` rewrite updated, pruned to the last 5 versions.`,
    '',
    `- Bundle size: ${size}`,
    '- Promote: merge this PR into `dev`; the batched `dev → main` release deploys it.',
    '- Rollback: revert the release commit or use Vercel Instant Rollback.',
    '',
    '🤖 Generated with [Claude Code](https://claude.com/claude-code)',
  ].join('\n');
}
```

- [ ] **Step 4:** Run tests → PASS (adjust the `releasePrBody` size-format assertion to whatever you emit — keep the contract: name@version + a human size).
- [ ] **Step 5: Commit:** `feat(release): pure bump/branch/pr-body helpers`.

### Task 5: Wire the flag into the release CLI (+ `--dry-run`)

**Files:** Modify `packages/release/src/cli.ts`; test `packages/release/tests/cli-args.test.ts` (extract the arg parser to make it testable)

- [ ] **Step 1: Extract + test the arg parser.** Pull argument parsing into a pure exported function (in `release.ts` or a new `src/cli-args.ts`): `parseReleaseArgs(argv: string[]): { name: string; bump?: BumpLevel; force: boolean; dryRun: boolean }`. Rules: the name is the first non-`--`-prefixed token (a leading `--`-token in the name slot is NOT a name → throw "missing widget name"); two bump flags throw; `--dry-run` is allowed **with or without** a bump — with a bump it previews the bump flow, without a bump it previews today's bare flow (prints what would be built/committed, no side effects). Failing test asserts: `['example']` → `{name:'example', force:false, dryRun:false}`; `['example','--minor']` → `bump:'minor'`; `['example','--patch','--dry-run']` → `bump:'patch', dryRun:true`; `['example','--dry-run']` → `{name:'example', dryRun:true}` (no bump); `['--minor']` (token in name slot) throws; `['example','--patch','--major']` (two bumps) throws.
- [ ] **Step 2:** Run → FAIL. Implement `parseReleaseArgs`. Run → PASS.
- [ ] **Step 3: Rewire `cli.ts`** around the parser. Behavior matrix (keep the existing build/copy/manifest/prune/commit block intact — it's the shared core):
  - **No bump flag (today's behavior, unchanged):** require the version already set; build; copy; manifest; prune; commit on the current branch; print "push + open a PR" — NO push, NO PR. (This is what the batched flow + the existing `pnpm release` callers expect; do not break it.)
  - **With `--patch|--minor|--major`:**
    1. **Guard:** working tree clean (`git status --porcelain` empty) — else abort with a clear message; `git fetch origin`.
    2. Compute `newVersion = nextVersion(currentPkgVersion, bump)`; create + checkout `releaseBranch(name, newVersion)` off `origin/dev`.
    3. Write the bumped version into `widgets/<name>/package.json`.
    4. Run the shared core (build → copy `cdn/<name>/<newVersion>/` → manifest → rewrites → prune).
    5. `git add cdn widgets/<name>/package.json` → commit `chore(release): <name>@<newVersion>`.
    6. Read the built bundle's gz size (gzip `dist/index.js`, e.g. `zlib.gzipSync`) for the PR body; `git push -u origin <branch>`; write the body to a temp file and `gh pr create --base dev --head <branch> --title "chore(release): <name>@<newVersion>" --body-file <tmp>`.
  - **`--dry-run` (only meaningful with a bump):** do steps through the version computation and PRINT the planned branch, new version, commit message, and PR title/body — but perform **no** branch creation, no file writes, no build, no git, no push, no gh. Exit 0. This is the safe path for tests/CI.
- [ ] **Step 4: Test the dry-run end to end** without side effects: in `cli-args.test.ts` (or a new `release-dryrun.test.ts`), invoke the dry-run path (call an exported `planRelease(name, bump)` pure function that returns `{ branch, newVersion, commitMessage, prTitle, prBody }`, which both `--dry-run` printing and the real path use) and assert the plan for a known widget+bump. Keep the actual `git`/`gh`/build calls in the CLI shell, untested here. Run → PASS.
- [ ] **Step 5: Manual smoke (dry-run only — MUST NOT push):** `pnpm release example --minor --dry-run` → prints branch `release/example-0.1.0` (or whatever the current example version bumps to), the commit message, and the PR body; makes no git changes (`git status` clean, branch unchanged). **Do NOT run a real `--minor` without `--dry-run`** — it would push and open a PR. Record the dry-run output in your report.
- [ ] **Step 6: Quality + commit:** `pnpm format && pnpm exec turbo run typecheck lint test --filter=@perimeter/release --force`. Commit: `feat(release): one-command release with version bump, branch, push, and PR`.

---

## Chunk 3: Docs + finalize

### Task 6: Update the hosting/release doc + finalize + PR

**Files:** Modify `docs/hosting-and-release.md` (+ `docs/creating-a-widget.md` if it describes the old copy-the-example flow); PR

- [ ] **Step 1: Doc update.** In `docs/hosting-and-release.md`, document both new commands accurately: `pnpm create-widget <name>` (what it scaffolds, that it runs `pnpm install`, commit the lockfile) and `pnpm release <name> --patch|--minor|--major` (bumps + builds + branch + push + PR; the bare form is still the manual/batched path; `--dry-run` to preview; promote = merge to dev, rollback = revert/Instant Rollback). Keep it consistent with the existing doc's voice. `docs/creating-a-widget.md` currently opens with "## 1. Copy the example" **and** a now-stale "register it in pnpm-workspace.yaml" step (the workspace globs `widgets/*`, so registration is automatic) — rewrite its on-ramp to lead with `pnpm create-widget <name>` and drop the manual-registration step. (The deeper end-to-end Claude workflow doc + skill is Phase 5 — just fix the command references here, don't write the whole guide.)
- [ ] **Step 2: Full gate:** `pnpm format`, `pnpm quality`, `pnpm exec turbo run typecheck lint test --filter=@perimeter/release --force`. All green. Confirm `git status` is clean and **no scaffolded test widget** (`widgets/demo-widget` etc.) was left behind — only the tooling, templates, and docs are staged across the branch (`git log --oneline origin/dev..HEAD`, `git diff --name-only origin/dev..HEAD`).
- [ ] **Step 3: PR.** Push `feat/dx-tooling`; write the PR body with the Write tool (the two commands + how to use them, the pure-core/side-effect split, that the bare `release` is unchanged, and that real push/PR was never exercised in tests — only `--dry-run`) and `gh pr create --base dev --body-file …`. Do NOT merge.
- [ ] **Step 4:** Report the PR URL + the create-widget and dry-run smoke results.

---

## Execution notes

- Tasks are sequential (shared tree; Task 3 needs Tasks 1–2; Task 5 needs Task 4).
- **The release command can push and open PRs — never let that fire in tests or the workflow.** All release-flow verification is pure unit tests + `--dry-run`. The only authorized push is Task 6's Phase-4 PR.
- The Task-3 manual smoke creates a real widget then deletes it — make sure nothing scaffolded (widget dir, its docs stub, lockfile churn) is committed.
- Out of scope (Phase 5): the full `creating-a-widget` end-to-end skill (mp-explorer → perimeter-api endpoint → widget → release), the broader docs/CLAUDE.md rewrite, and full component/guide content. Phase 4 ships the two commands + accurate command-reference docs only.
