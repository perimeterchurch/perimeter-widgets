# Phase 3 — Session Handoff (2026-05-28)

> Hand-off snapshot for resuming the Phase 3 (Hosting & Release) implementation in a new session. Branch: `docs/widgets-rebuild-design` in `perimeter-widgets/`. Nothing is pushed — all work is local on this branch.

## Where the work lives

- **Umbrella spec:** `docs/superpowers/specs/2026-05-22-perimeter-widgets-rebuild-design.md`
- **Phase 3 spec:** `docs/superpowers/specs/2026-05-27-perimeter-widgets-phase-3-hosting-release-design.md`
- **Phase 3 implementation plan:** `docs/superpowers/plans/2026-05-27-perimeter-widgets-phase-3-hosting-release.md` (the source of truth for Chunks 2–7; the plan has been amended several times during Chunk 1 — read it fresh, don't trust memory of an earlier version)
- **Project root:** `perimeter-widgets/` is the git repo. The session ran from `/Users/parkerb/dev/perimeter/claude/` (parent) — git commands need `git -C perimeter-widgets …` or `cd perimeter-widgets` first.

## Status

- **Chunk 1 (`@perimeter/release-store` foundation): ✅ COMPLETE**
- **Chunks 2–7: pending** (task IDs #57–#62)
- **Repo gate:** `pnpm quality` → 36/36 tasks green, prettier clean.
- **Branch:** `docs/widgets-rebuild-design`, **49 commits ahead of `origin/dev`**, never pushed.

## What Chunk 1 produced

The package `@perimeter/release-store` at `packages/release-store/`:

```
packages/release-store/
  package.json · tsconfig.json · vitest.config.ts
  src/
    index.ts                  re-exports createStore, createMemoryKv, createMemoryBlob, all types
    types.ts                  BuildRecord, ActivityEntry, ActivityAction, ReleaseStore interface
    clients.ts                KvClient, BlobClient (body: Uint8Array, set(value: unknown))
    keys.ts                   latestKey(name), buildsKey(name), ACTIVITY_KEY
    store.ts                  createStore(kv, blob) — the only logic module
    drivers/
      memory.ts               createMemoryKv(), createMemoryBlob() — used by tests + RELEASE_STORE_DRIVER=memory
  tests/                      15 tests across types/keys/memory-driver/store
```

15 tests pass. Typecheck + lint clean. The package exports the surface Chunks 2–6 will consume.

## Commits (most recent first, all on `docs/widgets-rebuild-design`)

```
cb7acf0 chore(release-store): prettier formatting
5958b89 test(release-store): document non-atomic activity write + assert cap tail
4ccc4c0 feat(release-store): add store core with ledger, pointer, idempotency, activity cap
b862b07 refactor(release-store): tighten memory driver signatures (typed stream, explicit contentType)
d880864 feat(release-store): add in-memory kv + blob driver
4bb1ec6 docs(widgets): drop .ts extensions from value imports in plan
f79727e feat(release-store): add kv key builders
5dea3f2 docs(widgets): widen body to Uint8Array, drop empty set<T> generic in plan
241a5a7 refactor(release-store): widen body to Uint8Array, drop empty set<T> generic
19ffc1c feat(release-store): add data types and client interfaces
73ef6a1 docs(widgets): update Phase 3 plan to use @upstash/redis (kv dep swap)
5df33b8 chore(release-store): swap deprecated @vercel/kv for @upstash/redis
5c42106 chore(release-store): scaffold package
9958f5e docs(widgets): revise Phase 3 plan per reviewer (blocking fixes)
b0e3e60 docs(widgets): add Phase 3 implementation plan
```

## Plan deviations applied during Chunk 1 (important — affects downstream tasks)

These changes are already in the plan (`docs/superpowers/plans/2026-05-27-perimeter-widgets-phase-3-hosting-release.md`); re-read the plan before each chunk.

1. **`@vercel/kv` → `@upstash/redis`.** `@vercel/kv@3.0.0` is officially deprecated. Vercel's Redis Marketplace stores ARE Upstash under the hood and expose the same `KV_REST_API_URL` + `KV_REST_API_TOKEN` env vars. Chunk 2's Vercel driver will use `import { Redis } from '@upstash/redis'; const client = new Redis({ url, token })` — already updated in the plan.

2. **`BlobClient.put` body widened from `Buffer` to `Uint8Array`** (and `ReleaseStore.uploadBundle` likewise). Buffer is Node-only and would have forced casts at the Vercel-driver boundary; Buffer structurally satisfies Uint8Array so all existing call sites (publish script's `readFileSync`, tests with `Buffer.from(...)`) still work without changes. Also dropped the empty `set<T>(value: T)` generic to `set(value: unknown)` — the generic gave no real type safety.

3. **`.ts` extensions stripped from all value imports** in the plan. TS with `moduleResolution: "Bundler"` rejects `.ts` extensions on value imports unless `allowImportingTsExtensions` is set; the codebase convention is no extension (matches `api-hooks`). The plan was fixed plan-wide.

4. **Project-wide eslint addition:** `argsIgnorePattern: '^_'` added to `eslint.config.js` so intentionally-unused params like `_contentType: string` lint clean. This is a small convention adopted during Chunk 1; downstream tasks may use the same `_param` pattern.

## What's next (Chunks 2–7)

The task tracker has pending tasks #57–#62 for these. Each chunk's full text lives in the plan; read it directly — do not work from this summary alone.

| # | Chunk | What it builds |
|---|---|---|
| 57 | 2 — Vercel driver + getStore selector | KV env detection (`resolveKvConfig`), `createVercelKv`/`createVercelBlob` (uses `@upstash/redis` + `@vercel/blob`), and the `getStore()` factory that picks memory vs vercel via `RELEASE_STORE_DRIVER` and the env vars. |
| 58 | 3 — apps/cdn serving app | New Next.js app at `widgets.perimeter.org`. Lazy memoized `releaseStore()` accessor (do NOT call getStore at module top level — would break `next build` without creds). Route handlers under `src/app/api/...` for bundle / bundle-map / latest / manifest, plus `next.config.ts` rewrites mapping public dotted URLs to those `/api` routes (proven Studio pattern; sidesteps any dotted-route-segment concerns). |
| 59 | 4 — publish-widget script | Testable `publishWidget(opts, hooks)` orchestration in the release-store package + thin CLI wrapper at `packages/release-store/scripts/publish-widget.ts`. Root convenience script: `pnpm publish-widget <name>`. |
| 60 | 5 — Studio Better Auth + /admin gate | MP OAuth via `genericOAuth` (cookie prefix `studio`, stateless — matches helpdesk pattern, not metrics's stateful one). Middleware presence-check on `/admin/*`. Login page uses `signIn.social({ provider: 'ministryplatform', callbackURL })` — verified pattern from `metrics/src/app/signin/page.tsx:25`. |
| 61 | 6 — /admin/releases UI | Server actions (promote, rollback) with server-side `auth.api.getSession` re-check (defense in depth). Server-component page lists builds + activity. Client `ReleasePanel` for promote/rollback buttons + confirm. |
| 62 | 7 — integration, docs, quality | End-to-end memory-driver lifecycle test (publish → promote → rollback) in apps/cdn. CDN README + env/provisioning docs. CLAUDE.md status update. `pnpm quality` green. |

**Out of Phase 3 scope but tracked:**

| # | Task | Reason |
|---|---|---|
| 49 | Cutover blocker: replace per-mount `randomUUID` nuqs prefix with a stable one | `widgets/sermons/src/App.tsx:37` — bookmarkable URLs regress vs legacy. Phase 4 cutover gate. |
| 50 | Hosting follow-up (non-blocking): self-host the pdf.js worker | `widgets/sermons/src/components/players/PdfViewer.tsx:23` loads from `//unpkg.com`. Deferred. |

## Standing constraints (do NOT violate)

1. **Never push.** All work stays local on `docs/widgets-rebuild-design`.
2. **Branch:** `docs/widgets-rebuild-design`. Never commit to `dev` or `main`.
3. **Always use `pnpm`** — never `npm` or `npx`.
4. **Conventional commits.** Style established by the existing commits — match it.
5. **Commit messages via `git commit -F -` heredoc or a temp file**, not `-m` for multi-line bodies. Always include the `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` footer on commits authored during the session.
6. **Pause at chunk boundaries** for review. The user has consistently asked to pause between chunks.
7. **TDD discipline** — every plan task is checkbox-step TDD (failing test first → minimal impl → green).
8. **No premature abstraction / no speculative features.** When a code-quality reviewer flags nits like "add a defensive copy" or "add a branded type for safety", evaluate against actual need — most are explicit YAGNI per the codebase's philosophy.
9. **Use the subagent-driven-development skill.** Plan task → implementer subagent → spec compliance reviewer → code quality reviewer → fix loop → next task. The implementer prompt should always include full task text inline; reviewers should be focused and short.

## Known LSP noise to ignore

The IDE's TypeScript diagnostics frequently flag false positives right after a new file is created (`Cannot find module '../src/foo'` and downstream `implicit any` cascades). The real gate is `pnpm --filter <pkg> typecheck` — if that exits 0, the diagnostics are LSP-not-indexed lag, not real issues. This recurred ~6 times during Chunk 1.

There is also a pre-existing diagnostic on `eslint.config.js:7` flagging `tseslint.config` as deprecated — pre-existing, not introduced here, still works.

## Resume prompt (paste into a fresh Claude Code session)

```
I'm resuming Phase 3 of the perimeter-widgets rebuild. Chunk 1 is complete; please execute Chunk 2 (Vercel driver + getStore selector) per the plan.

Read these three files first, in order:
1. docs/superpowers/handoffs/2026-05-28-phase-3-session-handoff.md — session handoff (current state, constraints, plan deviations applied during Chunk 1)
2. docs/superpowers/plans/2026-05-27-perimeter-widgets-phase-3-hosting-release.md — the implementation plan (Chunk 2 = Tasks 6–7)
3. docs/superpowers/specs/2026-05-27-perimeter-widgets-phase-3-hosting-release-design.md — the design spec, if you need design context

Then execute Chunk 2 via the superpowers:subagent-driven-development skill: per plan task, dispatch a fresh implementer subagent with the full task text inline, then spec-compliance review, then code-quality review, fix-loop until both ✅, commit (NEW commits — never amend), then next task. Pause at the end of Chunk 2 for my review.

Standing constraints (DO NOT violate):
- Never push to remote; everything stays local on branch `docs/widgets-rebuild-design`
- Use pnpm; conventional commits via `git commit -F -` heredoc with the Co-Authored-By footer
- Git repo is at perimeter-widgets/ — use `cd perimeter-widgets` or `git -C perimeter-widgets …`
- The pending Phase 3 tasks in the tracker are #57 (Chunk 2) through #62 (Chunk 7); mark #57 in_progress before starting, complete when both reviewers approve
- LSP diagnostics about "Cannot find module" right after creating a file are false positives — the real gate is `pnpm --filter <pkg> typecheck`
- When code-quality reviewers raise nits, evaluate against YAGNI; don't pile on speculative validators or types
```
