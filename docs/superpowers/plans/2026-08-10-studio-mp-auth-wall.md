# Plan: MP authentication wall on `style.perimeter.org` (studio), restricted to roles #2 / #237

> **Status:** Draft plan (2026-08-10). Not started. Owner sign-off + one MP-admin step required before it can go live.
> **Goal:** Gate the deployed studio behind Ministry Platform login **exactly like the Knowledge Base does** (Better Auth + MP OAuth/OIDC), and additionally **restrict access to MP users who hold security role `2` (Administrators) or `237` (Website Folder - Edit)**. Everyone else gets a "not authorized" page and no session.

---

## 1. Reference implementation — how the Knowledge Base does it

KB (`knowledgebase-2.0`, Next.js 15) is the template we copy:

- **`src/lib/auth/better-auth.ts`** — `betterAuth({...})` with the **`genericOAuth`** plugin configured for MP as an OIDC provider:
  - `discoveryUrl = ${MP_API_BASEURL}/oauth/.well-known/openid-configuration`
  - `clientId = MP_API_CLIENT`, `clientSecret = MP_API_SECRET`, `pkce: false`
  - scopes: `openid profile email offline_access http://www.thinkministry.com/dataplatform/scopes/all`
  - `mapProfileToUser` maps `given_name`/`family_name`/`email` onto the user.
- **`src/app/api/auth/[...all]/route.ts`** — `toNextJsHandler(auth)` mounts the whole auth surface (login start, OAuth callback, session, signout) under `/api/auth/*`.
- **`src/middleware.ts`** — edge-runtime **presence check** on the `kb.session_token` cookie via `getSessionCookie(req, { cookiePrefix: 'kb' })`; missing cookie → redirect to `/signin`. Full validation happens server-side, not in middleware.
- **MP OAuth redirect URI** registered on the MP OAuth client: `http://localhost:5700/api/auth/oauth2/callback/ministryplatform` (dev) + the deployed URL.

### What we learned that changes the effort estimate

- **No session database.** KB's `betterAuth()` has **no `database`** and the repo has **no DB driver** (no kysely/drizzle/pg/mssql) and **no auth tables** in `db/migrations` (those are all KB-article tables). It runs cookie-backed:
  ```
  session.cookieCache.enabled = true
  account.storeStateStrategy  = 'cookie'
  account.storeAccountCookie  = true
  ```
  → **The studio needs no database.** This was the biggest cost in the first estimate and it's gone.
- **`better-auth` is pinned to `1.5.5`.** 1.6.x imports `kysely` symbols the resolved version lacks and breaks the build. **Pin to `1.5.5`.**
- **MP OIDC claims are identity-only.** Discovery (`…/oauth/.well-known/openid-configuration`) advertises `display_name, given_name, family_name, middle_name, nickname, zoneinfo, locale, email` — **no role claims, no MP user-id claim.** Userinfo endpoint: `…/oauth/connect/userinfo`. So role authorization must be a **post-login MP REST lookup**, not a token claim.

---

## 2. The core wrinkle — the studio is a static Vite SPA, KB is Next.js

The studio (`studio/`) is a **Vite SPA** deployed as a **static** Vercel project (Root Directory = repo root, build `pnpm --filter @perimeter/studio build`, output `studio/dist`; repo-root `vercel.json` only does the SPA-fallback rewrite; **zero env vars today**). Better Auth's server handler, the OAuth callback, and the middleware **all need a server/edge runtime**, which a pure-static build doesn't have.

**Two ways to add that runtime (decision required — see §8):**

- **Option A (recommended): keep the Vite SPA, bolt on a Vercel Edge Middleware + a Vercel Serverless Function.** Better Auth is framework-agnostic (`auth.handler(request)` works outside Next). Least disruptive; the design-system studio stays a Vite app.
- **Option B: migrate the studio to Next.js.** Maximally faithful to KB's stack (can copy files nearly verbatim) but a large, risky rewrite of a Turborepo Vite app for no benefit beyond the copy-paste. Not recommended.

**Decision (2026-08-10): Option C — a thin Next.js shell.** KB is a standalone Next.js app whose middleware + auth routes are Next-owned, so it proves the Better Auth + MP OIDC half but NOT Option A's raw-Vercel-function + `@vercel/edge` + pnpm-resolution path. Rather than de-risk that unproven path, we host the auth surface in a **Next.js shell** (copying KB's wiring near-verbatim) that gates everything and serves the Vite-built `studio/dist` as static assets. This inherits KB's proven setup and also keeps the wall OUT of the existing Vite dev/test harness. Plan below is written for **Option C**.

---

## 3. Target architecture (Option C — Next shell)

A new Next.js app (the **studio shell**) is the `style.perimeter.org` deployment. It runs Better Auth + Next middleware (copied from KB) and serves the Vite-built `studio/dist` as static assets behind the gate.

```
Browser → Next middleware (cookie presence-check)                     [shell]
            ├─ no `studio.session_token` cookie → 302 /signin
            └─ cookie present → serve the Vite studio (studio/dist, SPA fallback)

/signin (Next page) → Better Auth client → /api/auth/... (ministryplatform)   [shell]
   → MP authorize → callback /api/auth/oauth2/callback/ministryplatform (Next route handler)
      → Better Auth genericOAuth exchanges code, runs the ROLE GATE (§4, claim-based)
         ├─ roles ∋ Administrators | Website Folder - Edit → set session cookie → 302 into the studio
         └─ otherwise                                       → no session → 302 /unauthorized
```

- **`app/api/auth/[...all]/route.ts`** — `toNextJsHandler(auth)`, verbatim from KB (Node runtime; needs the client secret + outbound MP).
- **`src/middleware.ts`** — KB's Next presence-check with `cookiePrefix: 'studio'`; matcher excludes `api`, `_next`, static assets, `signin`, `unauthorized`, favicon.
- **Static studio** — the shell serves `studio/dist` (the unchanged Vite build) with an SPA-fallback rewrite for client routes/deep-links.
- **Cookie prefix `studio`** (KB uses `kb`; distinct so cookies never collide on `*.perimeter.org`).
- **Session:** cookie-backed, same settings as KB. No DB.
- **Test harness untouched:** the wall lives only in the shell; the Vite studio's own `pnpm dev` + Playwright/visual suites hit the Vite server directly and stay ungated.

---

## 4. The role gate — restrict to role `2` or `237`

> **⚡ Phase 0 update (verified live 2026-08-10 via a real login):** MP's OIDC profile (with the `scopes/all` scope) is **rich** — it includes a **`roles` claim listing the user's security-role NAMES** (e.g. `["Administrators","Basic Reports",…]`), plus `sub` (== `dp_Users.User_GUID`), `ext_User_GUID`, `ext_User_Name`, `ext_Contact_ID`. **Recommended gate: inspect the `roles` claim — no MP REST lookup, no service client, no identity mapping.** Allow if `roles` includes **`"Administrators"`** or **`"Website Folder - Edit"`**. Caveat: the claim gives *names* not ids; role 2's name is protected (safe), role 237's is editable — a rename would silently fail **closed** (locks out, never over-grants), acceptable for an internal tool; document the allowlist as names, or keep the by-id lookup below if rename-proofing matters. The REST-lookup approach below is now the **fallback**, not the primary.

---

_Fallback (only if a live/by-id check is required):_ resolve the MP user and check `dp_User_Roles`:

**Resolution + check (single MP REST call using the client-credentials service client — the same `MP_API_CLIENT`/`MP_API_SECRET`):**

```
GET {MP_API_BASEURL}/tables/dp_User_Roles
  ?$select=User_Role_ID,User_ID,Role_ID
  &$filter=(Role_ID=2 OR Role_ID=237)
           AND User_ID_Table_Contact_ID_Table.Email_Address='{email}'
```

- **≥1 row → authorized.** 0 rows → **deny**.
- `{email}` is the OIDC `email` claim, URL-encoded (single-quotes doubled).
- **Route through `Contacts`, not `dp_Users`.** ⚠️ Phase 0 finding (validated live 2026-08-10): `dp_Users.User_Email` is frequently **NULL** and `User_Name` is a **login**, not the person's email — matching the email claim against `dp_Users` returns nothing. The reliable key is `email → Contacts.Email_Address → dp_Users.Contact_ID → dp_Users.User_ID → dp_User_Roles` (the multi-hop `User_ID_Table_Contact_ID_Table.Email_Address` traversal above). Confirmed this returns the Administrators (Role 2) row for a known admin.
- Uses the **service client** (client_credentials), not the user's token, so the lookup doesn't depend on the signed-in user having rights to read `dp_User_Roles`.
- **Uniqueness caveat:** if an email can map to multiple contacts/users, decide whether ANY matching user with the role passes, or resolve to a single canonical user first. (Verify during build.)

**Where to enforce it in Better Auth:** run the lookup inside the genericOAuth sign-in path and **abort if unauthorized** so no user/session is created. Candidate hooks (verify exact API against better-auth `1.5.5` during the spike):
- `genericOAuth` `mapProfileToUser` (async) — throw to abort the callback; **or**
- `databaseHooks.user.create.before` / `session.create.before` returning `false`/throwing.

Store the resolved roles on the user/session (e.g. `roles: [2]`, `authorized: true`) for display and for a defense-in-depth re-check.

**Defense in depth (roles change over time):**
- Middleware stays a **presence check** only (fast, Edge). It is *not* the authorization boundary — it only proves "has a session".
- Add a lightweight **`/api/me`** serverless route the SPA calls on load that re-validates the session and returns `{ authorized, roles }`; if `authorized` is false, the SPA shows `/unauthorized` and calls signout.
- Keep session `cookieCache.maxAge` modest (e.g. 1h) and/or re-run the role lookup on session refresh so a revoked role takes effect within the hour rather than at the 7-day session expiry.

> **Robustness note:** matching by `email` is the pragmatic join we're certain we have. A more robust key is the OIDC `sub` (MP typically sets it to `dp_Users.User_GUID`), but the discovery doc doesn't advertise `sub`, so **confirm during the spike** whether the ID token carries `sub` and whether it equals `User_GUID`; if so, prefer `User_GUID = sub` over email matching.

---

## 5. Work breakdown

### Phase 0 — Spike / de-risk  →  harness at [`spikes/mp-auth-phase0/`](../../../spikes/mp-auth-phase0/)
- [x] **Harness built & boots.** Better Auth **1.5.5** (pinned) + genericOAuth(MP), cookie-backed (no DB), Node server mounts `/api/auth/*` + `/me`; smoke-tested (`/api/auth/get-session → 200`, `/me → {authenticated:false}`).
- [x] **Role query validated live (2026-08-10).** `email → Contacts → dp_Users → dp_User_Roles` filtered to `Role_ID IN (2,237)` returns the expected Administrators row for a known admin; empty for a non-holder. Implemented in `mp-roles.mjs`.
- [x] **Identity mapping resolved.** Email-match on `dp_Users` is unreliable (null `User_Email`, login-style `User_Name`) → route through `Contacts` (see §4).
- [x] **OAuth round-trip + claim inspection — DONE (real login 2026-08-10).** Dev redirect URI registered on the `perimeter-api` client; full authorization_code flow completed and a session was created for an authorized user (`roles: "2"`). **Key result:** MP returns a `roles` claim (role NAMES) + `sub`==`User_GUID` + `ext_Contact_ID`/`ext_User_Name` → **gate on the `roles` claim; the MP REST lookup is unnecessary** (see §4 update). All Phase 0 questions answered.

> Detailed Phase 1 breakdown below (Option C, re-scoped 2026-08-10). Gate is **claim-based** (roles claim; no MP REST lookup / service client / identity mapping). MP client creds are still needed for the OIDC code exchange. The auth surface is copied near-verbatim from KB (a known-good Next.js reference), so most tasks are "port + adapt," not "invent."

**Critical path:** `1.0 → 1.1 → 1.2 → 1.3 → 1.4 → 1.6 → 1.7` (1.5 runs alongside once 1.0 lands). Task 1.0 is the only real integration unknown, and it's LOW–MED (deterministic Next-serves-SPA wiring) rather than Option A's HIGH.

#### Task 1.0 — Stand up the Next shell that serves the Vite build · ~1d · risk: **LOW–MED**
Replaces Option A's raw-function spike. The one integration task: a Next app that gates + serves the existing Vite output.
- [ ] New Next 15 app in the repo (e.g. `studio-host/`); add its path to `pnpm-workspace.yaml` `packages:` (currently `studio`, `packages/*`, `widgets/*`). Pin `better-auth@1.5.5`.
- [ ] Build wiring: `pnpm --filter @perimeter/studio build` → `studio/dist`; the shell includes those assets (copy into the shell's `public/`, or a prebuild step) and adds an **SPA-fallback rewrite** so `/tokens`, `/components/*`, `/guides/*`, deep-links resolve to the SPA `index.html`.
- [ ] Vercel: reconfigure (or new project for) `style.perimeter.org` → Framework **Next.js**, Root Directory = repo root, build runs BOTH the Vite studio build and `next build`.
- **Accept (preview):** the studio renders through the shell; deep-links resolve; assets load; no console errors. (No unproven platform behavior — KB proves Next-on-Vercel; only the Vite-dist-in-Next + fallback is new, and it's well-trodden.)

#### Task 1.1 — Auth module (copy KB) + claim gate · ~0.5d · dep: 1.0
- [ ] Copy KB's `src/lib/auth/better-auth.ts` into the shell; `cookiePrefix: 'studio'`, `baseURL` = shell URL; cookie-backed, no DB; `additionalFields {firstName,lastName,roles}`.
- [ ] **Gate:** allow iff `profile.roles` includes `"Administrators"` OR `"Website Folder - Edit"` (`ALLOWED_ROLE_NAMES`); store matched. No MP REST lookup.
- [ ] **Clean deny → `/unauthorized`** (not the spike's throw→500); verify better-auth 1.5.5's error-redirect mechanism (`errorCallbackURL` / error param).
- **Accept:** unit tests — allowed roles → user; none → deny→`/unauthorized`, no session.

#### Task 1.2 — Auth route handler (copy KB) · ~0.25d · dep: 1.0, 1.1
- [ ] `app/api/auth/[...all]/route.ts` = `toNextJsHandler(auth)` (verbatim KB).
- **Accept (preview):** `/api/auth/get-session` → 200; sign-in → MP authorize URL; callback sets `studio.session_token`.

#### Task 1.3 — Middleware (copy KB) · ~0.25d · dep: 1.0
- [ ] `src/middleware.ts` = KB's presence-check with `cookiePrefix:'studio'`; matcher excludes `api`, `_next`, static assets, `signin`, `unauthorized`, favicon.
- **Accept:** unauth `/` → 302 `/signin`; `/signin`,`/unauthorized`, assets, `/api/*` reachable without a session; authed serves the studio; deep-links resolve.

#### Task 1.4 — `/signin` + `/unauthorized` + chrome · ~0.5d · dep: 1.2, 1.3
- [ ] Next pages `/signin` (better-auth client `signIn.oauth2({providerId:'ministryplatform', callbackURL:'/'})`) and `/unauthorized` (role requirement + sign-out).
- [ ] Surface sign-out / signed-in identity (better-auth client `getSession`) — ideally into the studio header.
- **Accept:** browser round-trip signin → MP → studio; unauthorized → `/unauthorized`; sign-out clears.

#### Task 1.5 — Dev + test story · ~0.25–0.5d · risk: **LOW** · dep: 1.0 (parallel to 1.1–1.4)
Option C keeps the wall OUT of the Vite harness — a real simplification vs Option A.
- [ ] The Vite studio's `pnpm dev` + Playwright/visual suites are unchanged and ungated (they hit the Vite server directly, not the shell). Confirm they stay green.
- [ ] Add `next dev` for the shell (its own port) to exercise the wall locally; document it in `docs/deploying-studio.md` / developer setup.
- [ ] Optional: a small shell middleware/gate unit test.
- **Accept:** existing `pnpm quality` + visual suites green **unchanged**; shell `next dev` shows the wall.

#### Task 1.6 — Env, MP registration, deploy · ~0.5d + MP-admin · dep: all above
- [ ] Shell Vercel project env: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `MP_API_BASEURL`, `MP_API_CLIENT`, `MP_API_SECRET`. Local `studio-host/.env.local` for `next dev`.
- [ ] Reconfigure the `style.perimeter.org` Vercel project to the Next shell (framework/build/root), or new project + repoint DNS. **Update `docs/deploying-studio.md`** (it currently documents a Vite-static project).
- [ ] **MP-admin:** add `https://style.perimeter.org/api/auth/oauth2/callback/ministryplatform` to the `perimeter-api` client (localhost already registered). Preview-URL strategy (stable alias + register, or test auth local+prod only).
- **Accept:** a preview (or prod) signs in end-to-end.

#### Task 1.7 — Verify & PR · ~0.5d · dep: all
- [ ] Manual: authorized in; unauthorized → `/unauthorized`; deep-links; sign-out. Confirm the **widget CDN** (`widgets.perimeter.org`) and **embed-lab** are unaffected (only the studio origin is gated).
- [ ] `pnpm format` → `pnpm quality` green. PR into `dev` (`--body-file`), link this plan.

**Rough total: ~3–4 focused days** + MP-admin turnaround. Tasks 1.1–1.3 are largely KB copy-ports; 1.5 parallels them.

### Cross-cutting risks (Option C)
- **R1 (LOW–MED) — Next-serves-the-Vite-build + SPA fallback wiring** (Task 1.0). Deterministic; KB proves the Next + auth half, only the static-serving step is new.
- **R2 (LOW) — reconfiguring the `style.perimeter.org` deploy** (Vite-static → Next) and updating `deploying-studio.md` / DNS (Task 1.6).
- **R3 (LOW–MED) — clean deny UX** vs the spike's 500 (Task 1.1) — depends on better-auth 1.5.5's error-redirect API.
- **R4 (LOW) — preview-deploy redirect URIs** can't all be pre-registered (Task 1.6).

> **Option C eliminated** Option A's HIGH risk (raw functions + monorepo better-auth resolution) and its MED risk (the wall blocking the Vite dev/test harness). Net: fewer, smaller risks.

---

## 6. Environment variables (new — studio Vercel project has none today)

| Var | Value | Notes |
|---|---|---|
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` | Fresh; do not reuse KB's/Metrics'. |
| `BETTER_AUTH_URL` | `https://style.perimeter.org` (prod) / `http://localhost:5173` (dev) | |
| `MP_API_BASEURL` | `https://ministryplatform.perimeter.org/ministryplatformapi` | |
| `MP_API_CLIENT` / `MP_API_SECRET` | MP OAuth client creds | Used for BOTH the OIDC login AND the client-credentials role lookup. See §8 on reuse vs dedicated. |

Local dev: a `studio/.env.local` (gitignored) with the same keys pointing at `http://localhost:5173`.

---

## 7. MP-admin dependency (blocking, external)

Register the studio's OAuth **redirect URI(s)** on the MP OAuth client:
- `https://style.perimeter.org/api/auth/oauth2/callback/ministryplatform`
- `http://localhost:5173/api/auth/oauth2/callback/ministryplatform` (local dev)
- (optional) the Vercel preview pattern if MP supports wildcards.

> This is a **different MP setting** from the two we've already touched:
> - The **widgets CORS allowlist** (fixed 2026-08-10) governs the in-widget `mpp-user-login` data fetches — unrelated to this wall.
> - This is the **OAuth client's redirect-URI allowlist**, the same registration KB required for port 5700.

---

## 8. Decisions to confirm

1. **Architecture:** ~~Option A vs B~~ — **RESOLVED 2026-08-10: Option C** (Next.js shell that gates + serves the Vite build). Chosen because KB already proves the Next + Better Auth + MP path; see §2/§3.
2. **MP OAuth client:** reuse the existing `MP_API_CLIENT` (as KB does — just add the studio redirect URIs) vs provision a **dedicated** client for the studio (cleaner isolation, its own secret). **Recommend dedicated if trivial to create; else reuse.**
3. **Role source of truth:** email-match vs `sub`/`User_GUID`-match (resolve in Phase 0).
4. **Re-check cadence:** how quickly a revoked role must lock a user out (drives `cookieCache.maxAge` and whether `/api/me` re-queries MP every load or caches).
5. **Who is "allowed"?** Confirmed set = role **2 (Administrators)** OR **237 (Website Folder - Edit)**. Any others? (Easy to extend the `IN (…)` list.)

---

## 9. Interactions & things NOT changed

- **Widget data auth is separate.** This wall gates *access to the studio site*. The per-widget MP `mpp-user-login` (localStorage `mpp-widgets_AuthToken`) that powers auth-gated widget *previews* is a different layer and is **not** satisfied by having a Better Auth session. (Optional future enhancement: bridge the Better Auth MP access token into `mpp-widgets_AuthToken` so gated widget previews light up automatically — needs verifying the token formats match; out of scope here.)
- **SPA deep-linking** must keep working — middleware must run *before* the SPA-fallback rewrite and must not swallow `/assets/*` or the auth routes.
- **Widget CDN** (`widgets.perimeter.org`) and the committed `cdn/` project are untouched.

## 10. Rollback

Purely additive to the studio Vercel project. Revert the PR (removes middleware, `/api`, auth deps, `/signin`); the studio returns to a public static SPA. Optionally remove the studio redirect URIs from the MP client. No CDN/loader/runtime surface changes.
