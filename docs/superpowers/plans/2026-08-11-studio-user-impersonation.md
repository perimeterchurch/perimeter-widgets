# Plan: user impersonation for the authenticated widgets in the studio

> **Status:** Draft plan (2026-08-11). Not started. Spans two repos (perimeter-api + perimeter-widgets). Builds on the studio MP-auth wall (`2026-08-10-studio-mp-auth-wall.md`) — the shell, the role gate, and the widget-auth bridge already exist and are live.

## 1. Goal & scope

Let an MP **Administrator (role 2)**, viewing the gated studio, **impersonate another MP user** so the authenticated widgets — **My Giving History** and **My Shepherds** — render *that user's* live data.

- **Use cases (both):** QA (see how the gated widgets render for different users) and support (view a user's real giving/shepherding data).
- **User-based only.** Impersonation targets people who have an **MP login account** (resolved by `User_ID`/GUID). Contact-based impersonation (arbitrary members without a login) is **explicitly out of scope** (confirmed 2026-08-11).
- **Restricted to Administrators (role 2)** — narrower than general studio access (which is roles 2 **or** 237).
- **Audited** and **visibly indicated** in the UI.

## 2. How data auth works today (context)

- The shell (`studio-host`) gates the studio (MP OIDC → Better Auth session, cookie `studio.session_token`), storing the matched roles on the session (`roles` = e.g. `"Administrators"`).
- **Widget-auth bridge:** `/api/mp-token` returns the signed-in user's MP access token → the studio writes it to `localStorage['mpp-widgets_AuthToken']` → the gated widgets call perimeter-api **directly** with that Bearer → perimeter-api resolves the **caller's own** Contact_ID.
- **perimeter-api impersonation primitive (already exists):** a service caller with `x-api-key: <API_SECRET_KEY>` may add **`x-on-behalf-of-user: <User_ID | GUID>`**; `authenticate()` then resolves that user (`src/lib/auth/index.ts`). Proven first-party-proxy precedent: the **ems-renewal** app.

## 3. Feasibility findings (verified 2026-08-11)

| Endpoint | Widget | On-behalf-of today? |
| --- | --- | --- |
| `GET /api/giving/history` | My Giving History | ✅ Works — uses `getAuthContactId(auth)` → `auth.userId` (which on-behalf-of sets) → target's Contact_ID. |
| `GET /api/shepherds` | My Shepherds | ⚠️ **Breaks** — passes `auth.type` (ok, `'user'`) but then calls `getShepherds(auth.username)`, and on-behalf-of leaves **`username` undefined** → empty result. Needs a perimeter-api fix. |

**The fix (one place):** in perimeter-api `authenticate()`, when honoring `x-on-behalf-of-user`, **populate `username`** (and `email` if cheap) on the returned context by resolving them from the `userId`. This makes shepherds — and any other username-keyed route — work under impersonation uniformly, rather than patching each route.

## 4. Target architecture

Normal (self) viewing is unchanged (direct token bridge). **Impersonation is an additive mode**, gated to admins, that routes the gated widgets through a shell proxy:

```
studio  ── admin picks "Impersonate as <user>" ──►  /api/impersonate/start (admin-only)
                                                       sets signed httpOnly cookie studio.impersonate = <targetUserId>

gated widget fetch  ──►  shell proxy /api/impersonate/data/*   (studio-host)
                           • require session role = Administrators (2)
                           • read target from the studio.impersonate cookie (NOT a client header)
                           • attach  x-api-key: API_SECRET_KEY  +  x-on-behalf-of-user: <target>
                         ──►  perimeter-api (authenticated) ──► target's data
```

- **Target held server-side** (signed httpOnly cookie set via an admin-only endpoint), so the browser can't set an arbitrary target — the proxy reads the cookie, never a client-supplied on-behalf-of header. Defense in depth on top of the admin session check.
- **Path whitelist:** the proxy forwards **only** the read endpoints the widgets need (`giving/history`, `shepherds`, and the user-search) — least privilege, never a general passthrough.
- **`API_SECRET_KEY` stays server-side** in the shell; never reaches the browser.

## 5. Work breakdown

### perimeter-api (its own PR → `dev`)
- [ ] **P-1 — populate `username` on the on-behalf-of context.** In `authenticate()` (`src/lib/auth/index.ts`), resolve and set `username` (+ `email`) for the on-behalf-of branch from `userId`. Add tests; update `docs/guides/authentication.md`. (Small.)
- [ ] **P-2 — user-search endpoint for the picker.** Confirm whether one exists (UserController). It must return MP users **with login accounts** matching a query (name/email → `{ userId or GUID, displayName }`, names via the Contact join per the repo rules — never `dp_Users.Display_Name`). If none exists, add it following controller/service conventions. Callable by a service/admin proxy.

### studio-host (shell) — perimeter-widgets
- [ ] **S-1 — admin check.** Helper `isAdministrator(session)` (session `roles` already includes `"Administrators"` when applicable). Expose it to the studio via `/api/me` (roles) so the UI can gate the control.
- [ ] **S-2 — impersonation session endpoints.** `POST /api/impersonate/start` `{ targetUserId }` and `POST /api/impersonate/stop` — **admin-only**; set/clear a **signed httpOnly** `studio.impersonate` cookie holding the target. Audit start/stop (impersonator → target).
- [ ] **S-3 — data proxy.** `/api/impersonate/data/[...path]` — admin-only; reads the target from the cookie; forwards **whitelisted** paths to perimeter-api with `x-api-key` + `x-on-behalf-of-user`. Audit each proxied request.
- [ ] **S-4 — user-search proxy.** `GET /api/impersonate/users?q=` — admin-only; proxies to P-2 with the service key.
- [ ] **Env:** `API_SECRET_KEY` (perimeter-api service key) + `PERIMETER_API_URL` (prod `https://api.perimeter.org`). Server-side only.

### studio (UI) — perimeter-widgets
- [ ] **U-1 — admin gate.** On load, read roles (`/api/me`); only show impersonation UI to Administrators.
- [ ] **U-2 — impersonate control.** A user picker (search via `/api/impersonate/users`) + Impersonate / Stop. Start → `POST /api/impersonate/start`, then activate impersonation mode.
- [ ] **U-3 — widget routing under impersonation (the fiddly bit).** While impersonating, the gated widgets must call the **shell proxy** with no user token (the proxy holds the service key), instead of the direct perimeter-api + `mpp-widgets_AuthToken` path. Mechanism: point the widgets' `apiBaseUrl` (set by `WidgetPreview`) at `/api/impersonate/data`, and suppress the localStorage-token bridge in that mode. Normal viewing must be untouched.
- [ ] **U-4 — banner.** Persistent "**Viewing as \<name\> — impersonating** · Stop" while active; clears on stop / sign-out.

### Verify & ship
- [ ] Two PRs: perimeter-api (P-1/P-2) → its `dev`; perimeter-widgets (shell + studio) → its `dev`. perimeter-api first (the widgets depend on P-1 for shepherds).
- [ ] Manual: as an Administrator, impersonate a known test user → giving history + shepherds show *their* data; banner shows; Stop restores self view. As a non-admin, the control is absent and the proxy 403s.

## 6. Security & audit (per the role-2 + support decision)

- **Hard gate on Administrators (role 2)** at every impersonation endpoint (`/start`, `/stop`, `/data`, `/users`) **and** the UI control — never trust the client; the server re-checks the session role each request.
- **Target is server-held** (signed httpOnly cookie), not a client header — a tampered client can't choose an arbitrary target.
- **`API_SECRET_KEY` server-side only.**
- **Audit both layers:** shell logs impersonator → target + action; perimeter-api already audits the on-behalf-of resolution.
- **Read-only:** the proxy whitelists GET on the widget endpoints only — impersonation can never drive a write.
- **Obvious UI:** the banner makes impersonation impossible to miss; cleared on sign-out.

## 7. Decisions to confirm

1. **Target set** — any MP user with a login account (search returns those), or a narrower list?
2. **Proxy scope** — whitelist the two widget endpoints (recommended, least privilege) vs a general `/api/data` proxy.
3. **UI placement** — where the picker + banner live (global header vs on the auth-gated widget pages).

## 8. Phasing & rough effort (~3–5 days, two repos)

- **Phase 0 (spike) — ✅ DONE (2026-08-11).** Against local perimeter-api `:5500` with `x-api-key` + `x-on-behalf-of-user: 68219`: `giving/history` → `200` with the target's real data (proves the mechanism); `shepherds` → `200 {"shepherds":[]}` (empty — confirms the `username` gap / P-1 need); `shepherds` with service key but NO on-behalf-of → `403 USER_AUTH_REQUIRED` (on-behalf-of is what yields the `'user'` context). Premise + P-1 validated; no surprises.
- **Phase 1 (~1 day):** perimeter-api P-1 (+ P-2 if needed) → PR.
- **Phase 2 (~1 day):** shell proxy + impersonation session + user-search proxy + env.
- **Phase 3 (~1–1.5 days):** studio admin gate, picker, widget routing (U-3), banner.
- **Phase 4 (~½ day):** verify + PRs.

## 9. Risks

- **R1 (MED) — widget data-layer routing (U-3):** switching `apiBaseUrl` to the proxy and suppressing the token bridge in impersonation mode without breaking normal viewing is the trickiest part.
- **R2 (LOW–MED) — user-search endpoint (P-2)** may not exist → added perimeter-api scope.
- **R3 (SECURITY) — service key in the shell:** broad credential; must be server-side only, and the proxy must be unreachable by non-admins (session + role check + server-held target + path whitelist).
- **R4 (LOW) — cross-repo sequencing:** perimeter-api P-1 must land before the shepherds path works under impersonation.
