# Widget Catalog + MP Login — Design

**Date:** 2026-07-08 (revised 2026-07-09 after adversarial audit)
**Status:** Approved by user (pre-planning)

## Summary

A staff-facing **Catalog** section in the existing studio SPA (deployed at
style.perimeter.org) for browsing released widgets, viewing them live as the
**shipped production bundles** from widgets.perimeter.org, copying embed
snippets, and playing with config attributes. Viewer pages for authenticated
widgets offer sign-in through the **default MinistryPlatform login widget**,
hosted on a dedicated popup page, so staff can see `auth: 'required'` widgets
working end-to-end.

The cdn project (widgets.perimeter.org) is **untouched** — it remains the
no-build static bundle host. Everything here ships inside `studio/` (plus one
test fixture in `packages/auth`).

## Goals

- Staff can browse every released widget, see it running against production,
  and copy a working embed snippet — without touching the repo.
- Authenticated widgets (`my-shepherds`, `my-giving-history`, future ones) are
  fully usable on their viewer pages via the real MP login flow.
- Each viewer page doubles as an honest bare-host check of the shipped bundle
  (real `loader.js` → manifest → immutable bundle, isolated from studio CSS/JS).

## Non-goals

- No changes to `cdn/`, the release CLI, `loader.js`, or
  `@perimeter/widget-runtime`. (`packages/auth` gains one **test fixture**
  covering MPWidgets' real `ExpiresAfter` format — no behavior change.)
- No new deployment target — the catalog rides the existing studio deploy.
- No auth for the catalog itself; the site stays public. Only the embedded
  widgets gate on MP sign-in.
- No listing of historical versions (the manifest only exposes the current one).
- No MP token refresh. Nothing in this design calls MP's refresh path, so a
  token that passes `ExpiresAfter` re-gates the widgets and the user signs in
  again via the popup. Accepted for v1.

## External assumptions — validate FIRST

Two MP-side behaviors this repo does not control. Both must be validated live
(a throwaway page on the deployed origin is enough) before building Units 5–6;
if either fails, the login feature needs MP-side configuration or a redesign,
while Units 1–4 are unaffected.

1. **OAuth return.** MPWidgets sends `state=encodeURIComponent(window.location)`
   with a fixed `redirect_uri` on MP's own host (`/widgets/signin-oidc`); MP
   then redirects back to the `state` URL with **`?cacheKey=<guid>`** appended
   (observed live; the token is exchanged at `/widgets/Home/Tokens`). Assumed:
   MP will echo a `style.perimeter.org` (and dev `localhost`) origin in that
   flow.
2. **Credentialed CORS allowlist.** MPWidgets calls
   `ministryplatform.perimeter.org/widgets/*` (GetAuthConfiguration,
   CSRFToken, GetAuthToken…) with `credentials: 'include'`, which forbids
   wildcard origins — MP must echo the exact `Origin` with
   `Access-Control-Allow-Credentials: true`. perimeter.org presumably already
   is allowlisted; **style.perimeter.org (+ localhost for dev) must be added
   on the MP side** (owner/MP-admin task) or every auth call fails.

## Architecture

New top-level section in the studio SPA, under the existing `Layout` shell:

| Route            | Page                                              |
| ---------------- | ------------------------------------------------- |
| `/catalog`       | Catalog landing — card grid of released widgets   |
| `/catalog/:slug` | Viewer — live shipped embed, playground, snippet  |
| `/mp-login.html` | Static popup page hosting the MP login widget     |

Routes added in `studio/src/routes.tsx`. The sidebar nav gains a **single
static "Catalog" link** (`lib/nav.ts`'s `buildNav` stays a pure synchronous
function; no per-widget nav items, since catalog membership depends on the
runtime manifest fetch). The committed SPA-fallback rewrite in
`studio/vercel.json` already serves deep links; `/mp-login.html` is a real
file in `studio/public/` (new directory, Vite default `publicDir`), which
Vite serves in dev and copies into `dist/`. Vercel serves filesystem matches
before applying rewrites, so the static file wins as-is; extending the
rewrite's negative lookahead to name it is optional (explicit intent only,
not load-bearing).

### Data flow

Each catalog entry joins two sources:

1. **Runtime — released state:** `fetch('https://widgets.perimeter.org/manifest.json')`
   (already served with `Access-Control-Allow-Origin: *` and 60s edge cache)
   → the set of released widgets and each one's current version.
2. **Build time — widget metadata:** the widget definitions the studio already
   imports via `import.meta.glob` (`studio/src/lib/discovery.ts`) → display
   name, `auth` mode (`required | optional | none`), zod config schema, docs.

Catalog list = manifest entries ∩ repo definitions, **minus `example`**.
`event-finder` (and any future widget) appears automatically once released.

Edge cases:

- **Manifest entry with no repo definition** (stale/removed widget): the
  landing shows a reduced **card** (name + version, link to viewer); its
  **viewer** shows the live embed + a generic snippet (no config attributes),
  but no playground and no sign-in panel (auth mode unknown).
- **Repo definition not in the manifest** (unreleased): not listed; its
  viewer URL renders `NotFoundPage` (after loading resolves).
- The CDN base URL (`https://widgets.perimeter.org`) is exported as
  `CDN_BASE_URL` from `studio/src/lib/catalog.ts` so tests and any future
  staging host can override it. (The MP platform origin appears only inside
  the static `mp-login.html`.)

## Units

### 1. Catalog data hook — `studio/src/lib/catalog.ts`

`useCatalog()` fetches the manifest and joins it with discovered definitions.

- **Interface:** returns `{ entries, isLoading, error, retry }` where each
  entry is `{ slug, version, definition? }` (definition absent for stale
  manifest entries). `example` filtered out. Entries sorted by slug.
- **Depends on:** `discovery.ts` (existing), `fetch`, `CDN_BASE_URL`.
- Pure join/filter logic is a plain exported function so it unit-tests without
  fetch. (No msw in the studio today; tests stub `fetch` via `vi.stubGlobal`.)
- Note: discovery's per-widget importers are lazy, so the hook awaits every
  released widget's `load()` to get its definition. "Definition absent" means
  *stale* only after loading completes; `isLoading` covers the interim.

### 2. Catalog landing — `studio/src/pages/CatalogPage.tsx`

Card grid from `useCatalog()`: widget display name, current version, auth
badge (`required` → "Sign-in required"; `optional` → "Personalized when
signed in"), one-line description (from MDX frontmatter — Unit 7), link to
`/catalog/<slug>`. No live embeds on the grid (fast load, no iframe fan-out).
While `isLoading`, the grid renders skeleton cards; manifest fetch failure →
error banner with a retry button.

### 3. Shipped-bundle preview — `studio/src/components/CdnBundlePreview.tsx`

The live embed. A same-origin `srcdoc` iframe (**never** given a `sandbox`
attribute — that would sever the shared-origin localStorage) whose document
is a minimal bare host page:

```html
<script src="https://widgets.perimeter.org/loader.js" async></script>
<div data-perimeter-widget="<slug>" data-…="<overrides>"></div>
```

- Extends the existing `BuiltBundlePreview` pattern (`window.onerror` +
  script-`onerror` → `postMessage` to the parent → visible error banner
  instead of a silent blank frame), but is **prod-visible** (not
  `import.meta.env.DEV`-gated) and loads via the real loader → manifest →
  immutable bundle chain rather than a local `dist/` file. (`loader.js`
  resolves its origin from `document.currentScript.src`, which is absolute
  here, so it works inside an `about:srcdoc` document; the manifest fetch is
  CORS `*`.)
- **Interface:** `{ slug, overrides, theme }` (`theme: 'light' | 'dark'`) →
  renders the iframe; the srcdoc is regenerated (clean remount) whenever
  overrides/theme change. `data-theme="dark"` goes on the placeholder div
  only when dark. The `data-nowprocket` attribute is deliberately omitted in
  the srcdoc (it exists for WP Rocket hosts; there is none in our iframe).
- **Attribute escaping is net-new** (no existing helper does it —
  `configToDataAttrs` interpolates raw, and `BuiltBundlePreview` only
  JSON-escapes script-context values): a small `escapeAttribute()` helper
  (escapes `&`, `"`, `<`, `>`) is applied to every override value in both the
  srcdoc and the snippet text. Lives next to the snippet builder (Unit 4).
- Existing `BuiltBundlePreview` is left as-is (dev-only, local dist); shared
  srcdoc/error-channel helpers may be extracted if the duplication is real,
  not preemptively.

### 4. Viewer page — `studio/src/pages/CatalogWidgetPage.tsx`

While `useCatalog()` is loading, renders skeleton blocks (the not-found
verdict waits for resolution). Then composes, top to bottom:

1. **Sign-in panel** (only when `definition.auth !== 'none'`) — see unit 5.
2. **Live embed** — `CdnBundlePreview` with current playground overrides.
3. **Config playground** — the existing zod-driven `ConfigPanel`
   (`describeSchemaFields`) bound to local override state. The preview theme
   follows the studio chrome theme until pinned by a local light/dark toggle
   (same `state.theme ?? chromeTheme` pattern as `WidgetPage`); theme state
   is ephemeral (not URL-persisted). Theme is a separate axis from the zod
   config — it is never part of the overrides map.
4. **Embed snippet** — copyable, always current:

   ```html
   <script src="https://widgets.perimeter.org/loader.js" data-nowprocket async></script>
   <div data-perimeter-widget="<slug>" data-…="overrides"></div>
   ```

   **The snippet and the preview emit the identical attribute set:** every
   override currently set in the playground, serialized with the existing
   camelCase→kebab mapping (`configToDataAttrs`' semantics) plus the new
   `escapeAttribute()`. No diffing against schema defaults — the override map
   starts empty, so untouched fields never appear. `data-theme="dark"` is
   appended (after the config attributes) only when the toggle is dark.
   `data-nowprocket` appears in the snippet because it is the canonical
   documented embed form for the WordPress hosts (`docs/hosting-and-release.md`).
   A small pure `buildEmbedSnippet(slug, overrides, theme)` in
   `studio/src/lib/embed-snippet.ts` owns this (plus `escapeAttribute`), and
   `CdnBundlePreview` reuses the same attribute serialization for its srcdoc.
5. **Docs links** — plain links (no MDX rendering here) to the widget's
   studio page (`/widgets/<slug>`), which already renders the widget's docs.

Unknown slug or unreleased widget → the existing `NotFoundPage`. Stale
manifest entry (no definition) → embed + generic snippet (no config
attributes), no playground, no sign-in panel.

### 5. MP login popup page — `studio/public/mp-login.html`

A **static classic page** hosting the default MP login widget. This is load
bearing: MPWidgets.js bootstraps exclusively from a `DOMContentLoaded`
listener with no late-load fallback (verified against the live bundle), so it
must be present in the initial HTML of a real document — it can never be
lazily injected into the SPA. A dedicated popup page keeps the ~690 KB bundle
and MP's credentialed network calls off every other studio route.

```html
<script id="MPWidgets" src="https://ministryplatform.perimeter.org/widgets/dist/MPWidgets.js"></script>
<mpp-user-login></mpp-user-login>
```

- The script tag is a plain blocking script (**not** `async`) so it evaluates
  before the page's `DOMContentLoaded`; the required `id="MPWidgets"` is how
  the bundle resolves its app root.
- **Sign-in leg:** the user clicks MP's login button; OAuth happens top-level
  in the popup (no framing concerns); MP redirects back to
  `/mp-login.html?cacheKey=<guid>`; MPWidgets exchanges the cacheKey and
  writes `mpp-widgets_AuthToken`/`mpp-widgets_ExpiresAfter` (+ IdToken,
  CSRFToken) to style.perimeter.org localStorage, then strips the param.
- **Self-close:** a small inline script polls for the token after a
  `cacheKey` return (250ms interval, ~10s cap) and calls `window.close()`; if the browser refuses, the
  page shows "You're signed in — you can close this window." The page also
  serves sign-out: `<mpp-user-login>` renders MP's Log Out button when a
  session exists.
- **Script-load failure:** `onerror` on the script tag reveals a static
  fallback block linking to https://www.perimeter.org/my-perimeter/.
- Styling: minimal inline CSS consistent with studio tokens (hand-written;
  this page is outside the React/Tailwind pipeline).

### 6. Sign-in panel — `studio/src/components/MpLoginPanel.tsx`

The viewer-page affordance (rendered only when `auth !== 'none'`):

- **State:** instantiates `MPLocalStorageAuth` from `@perimeter/auth` (added
  as a studio workspace dependency) to read/watch the token — the *same*
  reader the embedded widgets use, so the panel and the widgets can never
  disagree about signed-in state (including expiry: when `ExpiresAfter`
  passes, both flip to signed-out together). Disposes on unmount.
- **Signed out:** `required` → prominent panel above the embed ("This widget
  requires a signed-in Perimeter account") with a **Sign in** button;
  `optional` → compact secondary panel ("Sign in to see personalized data").
  The button calls `window.open('/mp-login.html', …)` (small popup window)
  from the click handler; if `window.open` returns `null` (popup blocked), an
  inline link to `/mp-login.html` (new tab) is shown instead.
- **Signed in:** compact confirmation with a "Manage sign-in" link opening
  the same popup (where MP's own Log Out lives). No token contents are ever
  displayed.
- The embed below shows the runtime `AuthGate`'s built-in "Please sign in"
  message until the storage event / poll (reader default: 1s) unlocks it —
  no `widget-runtime` changes.

### 7. Widget doc frontmatter — descriptions

Card descriptions come from `description:` frontmatter in
`docs/widgets/<slug>.mdx`. **This requires real pipeline work** (today the
studio's MDX transform has no frontmatter support, and a `---` block would
render as visible content on `/widgets/<slug>` pages):

- Add `remark-frontmatter` + `remark-mdx-frontmatter` to the MDX config in
  `studio/vite.config.ts` (one shared transform — applies to dev, build, and
  vitest alike), so frontmatter is stripped from rendered output and exposed
  as a `frontmatter` export.
- Reshape `studio/src/lib/widget-docs.ts` loader typing to surface
  `{ default: ComponentType, frontmatter?: { description?: string } }`, and
  let the catalog read it.
- Convert `docs/widgets/sermons.md` to `.mdx` (widget-docs deliberately
  ignores `.md`, and `sermons` is a released widget that would otherwise have
  no description). Note: `latest-sermon.mdx` already exists and just needs
  frontmatter; the sibling `latest-sermon.md` is a stale legacy planning doc —
  delete it, do **not** convert it (it would clobber the live `.mdx`).
- Add `description:` frontmatter to every `docs/widgets/*.mdx`. A widget
  without frontmatter simply shows no description.

## Error handling summary

| Failure | Behavior |
| --- | --- |
| Manifest fetch fails | Landing: banner + retry. Viewer: same banner in place of the embed. |
| Bundle fails to load/run in iframe | postMessage error channel → visible banner in the frame (existing pattern). |
| `MPWidgets.js` fails to load in the popup | Static fallback block + perimeter.org sign-in link; embed keeps its own gate. |
| Popup blocked | Inline new-tab link fallback in the panel. |
| localStorage blocked/quota (MPWidgets writes are unguarded) | Sign-in silently fails to persist; widgets stay gated; panel stays signed-out (truthful). Documented as a known MP limitation, not mitigated. |
| Token expires mid-session | Widgets re-gate and the panel flips to signed-out together (shared reader); user signs in again. No refresh (non-goal). |
| Unknown slug | `NotFoundPage` (after catalog load resolves). |
| Stale manifest entry | Reduced card; viewer without playground/sign-in panel. |

## Testing

Unit tests (happy-dom, existing studio patterns; `fetch` stubbed via
`vi.stubGlobal` — the studio has no msw):

- `catalog.ts`: join/filter logic — manifest ∩ definitions, `example`
  excluded, stale entries carry no definition, sort order, error/retry.
- `embed-snippet.ts`: identical attribute set to the preview; camelCase →
  kebab; `escapeAttribute` on hostile values (`"`, `<`, `&`);
  `data-theme` only when dark; `data-nowprocket` present; generic snippet for
  stale entries.
- `CdnBundlePreview`: srcdoc contains loader URL + placeholder div with the
  same serialized attributes; regenerates on override/theme change; error
  banner renders on a posted failure (mirror of the error-channel tests in
  `BuiltBundlePreview.test.tsx`); never emits `sandbox`.
- `CatalogWidgetPage`: skeletons while loading; sign-in panel for
  `required`/`optional`, none for `none`; NotFound after resolution.
- `MpLoginPanel`: signed-in/out rendering driven by seeded localStorage;
  `window.open` called with `/mp-login.html`; popup-blocked fallback link;
  disposes its auth reader.
- `packages/auth`: one new fixture asserting `getToken()` accepts MPWidgets'
  real `ExpiresAfter` format (native `Date.prototype.toString()`, e.g.
  `"Wed Jul 09 2026 12:00:00 GMT-0400 (Eastern Daylight Time)"`) — today's
  tests only cover ISO + epoch-ms.

Visual: one Playwright spec in the existing studio visual harness covering
`/catalog` and one viewer route (axe + snapshot). **Hermetic by route
interception**, consistent with the harness's mock-everything convention:
`manifest.json` → fixture manifest; `loader.js` + the versioned bundle →
served from the committed local `cdn/` files; perimeter-api calls → existing
fixture mocks. The MP popup is never opened (the spec only asserts the
panel's presence), so `MPWidgets.js` is never fetched.

Manual smoke (deployed site, after the two external assumptions are
validated): open `/catalog/my-shepherds`, sign in via the popup, watch the
shipped bundle unlock and render live data; confirm the popup self-closes and
`?cacheKey` never leaks into the viewer URL; copy the snippet onto an
embed-lab page and confirm it matches.

## Deployment note

The catalog ships with the normal studio build — no new infra. As of mid-June
the style.perimeter.org Vercel project was still an owner-pending setup step
(`docs/deploying-studio.md`); the full e2e MP OAuth check needs that deployed
origin **plus the two MP-side items above** (return-URL behavior, CORS
allowlist). Local dev works throughout (`pnpm dev`, real CDN), with MP
sign-in functional on localhost only if MP allowlists it — otherwise validate
sign-in on the deployed site.
