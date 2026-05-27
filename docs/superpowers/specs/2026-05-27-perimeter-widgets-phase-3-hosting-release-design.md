# Perimeter Widgets — Phase 3: Hosting & Release Design

> Phase 3 of the rebuild. Builds on Phase 1 (foundation) and Phase 2 (sermons port),
> both complete. This phase delivers how compiled widget IIFEs reach the browser from
> versioned URLs, plus the Studio admin UI that cuts releases. It resolves umbrella
> Open Questions **#1** (Blob vs. static) and **#3** (admin auth).
>
> Umbrella: `2026-05-22-perimeter-widgets-rebuild-design.md`.

## Goal

Stand up `apps/cdn` at `widgets.perimeter.org` serving versioned widget bundles, a
`@perimeter/release-store` package that owns the Blob + KV data model, a CI-ready
`publish-widget` script, and an authenticated `/admin/releases` UI in Studio for
manual promote/rollback. After this phase a developer can publish a sermons build,
promote it to live with one click, and roll back instantly — all without a redeploy.
WordPress still points at the legacy URL; the actual cutover is Phase 4.

## Decisions resolved during brainstorming

| Question | Decision | Rationale |
|---|---|---|
| OQ#1 — bundle storage | **Vercel Blob (bytes) + Vercel KV/Redis (pointer + ledger)** | Promotion/rollback is a single KV write, no redeploy. One store holds both the live pointer and the release ledger. KV writes are trivial SDK calls (vs. Edge Config's REST-API write path). Pure-static was rejected because every publish/rollback would be a redeploy and it breaks the "instant promote/rollback admin UI" requirement. |
| Publish trigger | **A CI-ready `pnpm publish-widget <name>` script** | One script is the unit of work (build → upload Blob → write KV record). A dev runs it locally now; the same script drops into a GitHub Action in Phase 4 with zero rework. |
| OQ#3 — admin auth | **MP OAuth via Better Auth, stateless, gating `/admin/*`** | Real per-user identity for the audit log; org-consistent (helpdesk + metrics already use this). Vercel's native protection is deployment-wide and can't gate just `/admin/*`. Stateless (no DB) matches helpdesk and keeps a database out of Phase 3. |
| Embed paths | **Direct embed + `manifest.json` now; global `loader.js` deferred** | Sermons cutover only needs the per-widget direct script. The loader only pays off at 2+ widgets on one page, so building its page-scan/dedup/observer logic now would be premature. |
| CDN ↔ Studio boundary | **Shared `@perimeter/release-store` package; no inter-app API** | Both apps + the publish script import one module that owns the KV schema and Blob paths. CDN stays read-only; all writes flow through the package. No network hop, no second auth surface. |

## Architecture

Three new units plus additions to Studio. `apps/cdn` is purely read-path; every write
(publish, promote, rollback) flows through `@perimeter/release-store`.

```
apps/
  cdn/                                   NEW · Next.js @ widgets.perimeter.org
    app/[name]/[version]/index.js/route.ts     immutable bundle — stream Blob
    app/[name]/[version]/index.js.map/route.ts immutable sourcemap
    app/[name]/latest.js/route.ts              pointer — 302 → versioned URL
    app/manifest.json/route.ts                 names → current /latest.js URLs
  studio/                                CHANGED · admin UI + auth
    middleware.ts                              gate /admin/* via Better Auth session
    src/lib/auth/better-auth.ts                MP OAuth (genericOAuth), cookie prefix `studio`
    src/lib/auth/auth-client.ts
    app/api/auth/[...all]/route.ts             Better Auth handler
    app/admin/login/page.tsx                   MP sign-in entry
    app/admin/releases/page.tsx                per-widget build list + activity log
    app/admin/releases/actions.ts              promote / rollback server actions

packages/
  release-store/                         NEW · @perimeter/release-store
    src/types.ts                               BuildRecord, ActivityEntry, Pointer
    src/clients.ts                             KvClient + BlobClient interfaces
    src/drivers/vercel.ts                      real @vercel/kv + @vercel/blob impl
    src/drivers/memory.ts                      in-memory fake (tests + local dev)
    src/store.ts                               pointer/ledger/activity + upload/read API

scripts/
  publish-widget.ts                      NEW · pnpm publish-widget <name>
```

### `@perimeter/release-store` — the single data-access module

Defines two narrow interfaces so nothing else couples to Vercel SDKs:

```ts
interface BlobClient {
  put(path: string, body: Buffer, contentType: string): Promise<void>;
  get(path: string): Promise<ReadableStream | null>;
  exists(path: string): Promise<boolean>;
}
interface KvClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}
```

The driver is selected by env: `RELEASE_STORE_DRIVER=memory` uses the in-memory fake
(tests + local dev with no cloud creds); otherwise the Vercel driver activates when
`KV_*` / `BLOB_*` are present. The Vercel driver's **env detection is an explicit,
tested unit**: it resolves the KV connection from whichever vars the store exposes
(`KV_REST_API_URL` + `KV_REST_API_TOKEN` for Vercel KV, or `REDIS_URL` for a marketplace
Upstash store) and throws a clear error if neither is present — the "confirmed at wiring
time" unknown must not become a silent runtime guess. `store.ts` exposes the only operations the rest of the
system uses: `listBuilds(name)`, `recordBuild(name, record)`, `getLatest(name)`,
`setLatest(name, version, by)`, `listActivity()`, `uploadBundle(...)`, `readBundle(...)`.

### Data model (KV)

All values are JSON. Keys owned exclusively by `@perimeter/release-store`.

| Key | Value | Written by |
|---|---|---|
| `latest:<name>` | `"1.4.2"` — the live version pointer | promote / rollback |
| `builds:<name>` | array of `BuildRecord`, newest first | publish |
| `activity` | append-only `ActivityEntry[]`, capped at the last 200 | publish / promote / rollback |

The `activity` cap is a read-modify-write on one key; it is **intentionally not made
atomic**. Concurrent writes have a theoretical lost-update window, which is acceptable
because promote/publish are manual, single-admin operations at this scale.

```ts
type BuildRecord = {
  version: string;        // "1.4.2" or dev "1.4.2-abc1234"
  sha: string;            // git short sha
  prUrl?: string;         // populated by CI in Phase 4; optional now
  sizeGz: number;         // gzipped byte size, measured at publish
  builtAt: string;        // ISO 8601
  blobPath: string;       // "sermons/1.4.2/index.js"
};

type ActivityEntry = {
  action: 'publish' | 'promote' | 'rollback';
  widget: string;
  version: string;
  at: string;             // ISO 8601
  by: string;             // session email; "script" for un-authed CLI publishes
};
```

### Blob layout

Immutable, write-once: `<name>/<version>/index.js` and `<name>/<version>/index.js.map`.
A published version's bytes live forever at their immutable path — which is what makes
rollback a pure pointer flip.

## Serving (apps/cdn)

| Route | Behavior | Cache-Control |
|---|---|---|
| `/<name>/<version>/index.js` | stream the immutable Blob bytes | `public, max-age=31536000, immutable` |
| `/<name>/<version>/index.js.map` | stream the immutable sourcemap | `public, max-age=31536000, immutable` |
| `/<name>/latest.js` | read `latest:<name>` → **302 redirect** to the versioned URL | `public, s-maxage=300, stale-while-revalidate=86400` |
| `/manifest.json` | build `{ "<name>": "/<name>/latest.js" }` from all pointers | `public, s-maxage=300, stale-while-revalidate=86400` |

**Why `latest.js` is a 302, not a byte-proxy:** the heavy bundle bytes get the 1-year
immutable cache (downloaded once, ever); only the tiny redirect carries the ~60s TTL.
A `<script src=".../latest.js">` follows the 302 transparently. Promotion flips one KV
value and the redirect target changes within ~60s globally — no redeploy, no Blob
rewrite. `Content-Type: application/javascript; charset=utf-8` on the JS routes.

**Embed (unchanged from umbrella, direct path only this phase):**

```html
<div id="sermons-1" data-perimeter-widget="sermons" data-limit="6"></div>
<script src="https://widgets.perimeter.org/sermons/latest.js" async></script>
```

## Release flow

### Publish — `pnpm publish-widget <name>`

A thin CLI over `@perimeter/release-store`:

1. `turbo build --filter=@perimeter/widget-<name>` → IIFE + sourcemap.
2. Read `version` from the widget's `package.json`; read git short `sha`. Non-`main`
   builds append `-<sha>` (`1.4.2-abc1234`) so dev builds never collide with releases.
3. **Idempotency guard:** if `builds:<name>` already contains this version, refuse
   (immutable paths must never be overwritten). `--force` is permitted only on a
   `-sha` dev build.
4. Upload bundle + sourcemap to Blob at `<name>/<version>/`. Measure `sizeGz`.
5. **Only after the bytes land**, append the `BuildRecord` to `builds:<name>` and an
   `ActivityEntry`. The build is now **available**, not live.

This is the exact unit a GitHub Action calls in Phase 4 — different trigger, same script.

### Promote / rollback — Studio `/admin/releases`

Server components + server actions, entirely behind the auth gate:

- Per-widget panel lists every build (version, sha → PR link, size gz, built-at); the
  live build is badged **LATEST**.
- **Promote to latest** → confirm dialog → server action calls `setLatest(name, version, by)`
  (writes `latest:<name>` + activity).
- **Roll back** → pick any prior build → same `setLatest` path. Mechanically identical
  to promote; always valid because the bytes still exist at their immutable path.
- A global **activity log** shows the most recent ~200 events with `by`.
- Server actions **re-check the session server-side** (defense in depth — never trust
  the middleware alone). Promoting a version absent from `builds:<name>` is rejected.

## Auth (Studio)

Reuse the sibling pattern (metrics/helpdesk) verbatim, adapted to Studio:

- `src/lib/auth/better-auth.ts`: `betterAuth({ ... })` with the `genericOAuth` plugin,
  `providerId: 'ministryplatform'`, `discoveryUrl: ${MP_API_BASEURL}/oauth/.well-known/openid-configuration`,
  scopes `openid profile email offline_access http://www.thinkministry.com/dataplatform/scopes/all`,
  `pkce: false`, `mapProfileToUser` → name/email/first/last.
- **Cookie prefix `studio`** (not `perimeter`/`metrics`). **Stateless** — no DB adapter,
  matching helpdesk; the cookie session carries identity.
- `app/api/auth/[...all]/route.ts` mounts the Better Auth handler.
- `middleware.ts` with matcher `/admin/:path*`: a **presence check** at the edge (via
  Better Auth's `getSessionCookie`, mirroring the metrics middleware) — no `studio.session_token`
  cookie → redirect to `/admin/login` (MP OAuth sign-in). The edge does **not** verify the
  signature/expiry (that avoids redirect loops and keeps edge work cheap); full validation
  happens in the server actions via `auth.api.getSession`. Everything outside `/admin` stays
  public-readable.
- MP OAuth redirect URI: `https://studio.perimeter.org/api/auth/callback/ministryplatform`.

## Error handling

- `latest:<name>` missing (never promoted) → `latest.js` 404s and `manifest.json` omits
  it. The widget simply isn't live yet; published-but-unpromoted builds are invisible to embeds.
- Blob upload fails mid-publish → the ledger write never happens (record only after bytes
  land), so a build is never half-published.
- Promote/rollback to a version not in `builds:<name>` → server action rejects.
- CDN read for a `<version>` whose Blob is absent → 404 (should not occur given the
  publish ordering, but handled).

## Testing

The design is built around injectable clients so no test touches real Vercel services.

- **`@perimeter/release-store`:** unit-test pointer/ledger/activity logic, the
  idempotency guard, the 200-entry activity cap, and rollback against the in-memory fake.
- **CDN handlers:** with the fake — versioned route sets immutable headers; `latest.js`
  302s to the correct version; `manifest.json` reflects pointers; missing pointer → 404.
- **Publish script:** orchestration (artifact in → Blob write + ledger append) against
  fakes; duplicate-version guard refuses.
- **Studio:** middleware test (no session on `/admin/*` → redirect; valid session →
  pass); component tests for the release panel (promote/rollback invoke the server action
  with the right version); server-action session re-check.
- **Local dev without cloud creds:** `RELEASE_STORE_DRIVER=memory` runs `apps/cdn` and
  the publish script end-to-end locally.

## Provisioning (Vercel dashboard — developer steps, documented for the plan)

1. Create a **Blob store**. Studio + the publish script need the read-write token
   (`BLOB_READ_WRITE_TOKEN`); `apps/cdn` is read-only, so bind a read-only token there
   if Vercel Blob offers one, to keep its credentials matching the read-only boundary.
2. Confirm the existing **Redis/KV** binding exposes env vars to both apps. The Vercel
   driver adapts to whichever the store provides (`KV_REST_API_URL`/`KV_REST_API_TOKEN`
   for Vercel KV, or `REDIS_URL` for a marketplace Upstash store) — to be confirmed at
   wiring time.
3. Studio env: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `MP_API_BASEURL`, `MP_API_CLIENT`,
   `MP_API_SECRET`; register the OAuth redirect URI above.
4. Point `apps/cdn` at `widgets.perimeter.org`.

## Out of scope (deferred)

- **Global `loader.js`** — until a second widget exists (page-scan/dedup/observer).
- **GitHub Actions automation** — Phase 4; the publish script is the seam.
- **WordPress cutover + jsDelivr retirement** — Phase 4.
- **Stable nuqs URL prefix** — task #49, a Phase 4 cutover gate.
- **Self-hosting the react-pdf worker** — task #50.
- **Widget runtime auth (MP localStorage token)** — unchanged from Phase 1; this phase
  concerns hosting and *admin* auth only.

## Success criteria

1. `pnpm publish-widget sermons` builds, uploads to Blob, and records an available build.
2. `apps/cdn` serves `/sermons/<version>/index.js` (immutable) and `/sermons/latest.js`
   (302 → versioned) with the correct cache headers; `/manifest.json` lists current URLs.
3. A developer signs in via MP OAuth, promotes a build, and sees the embed go live; a
   rollback flips it back — both without a redeploy.
4. Unauthenticated access to `/admin/*` redirects to sign-in; the rest of Studio is public.
5. Full test suite green across the new package, the CDN app, the publish script, and the
   Studio admin additions; repo `pnpm quality` passes.
