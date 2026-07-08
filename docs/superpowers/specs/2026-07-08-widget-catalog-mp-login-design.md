# Widget Catalog + MP Login — Design

**Date:** 2026-07-08
**Status:** Approved by user (pre-planning)

## Summary

A staff-facing **Catalog** section in the existing studio SPA (deployed at
style.perimeter.org) for browsing released widgets, viewing them live as the
**shipped production bundles** from widgets.perimeter.org, copying embed
snippets, and playing with config attributes. Viewer pages for authenticated
widgets embed the **default MinistryPlatform login widget** so staff can sign
in and see `auth: 'required'` widgets working end-to-end.

The cdn project (widgets.perimeter.org) is **untouched** — it remains the
no-build static bundle host. Everything here ships inside `studio/`.

## Goals

- Staff can browse every released widget, see it running against production,
  and copy a working embed snippet — without touching the repo.
- Authenticated widgets (`my-shepherds`, `my-giving-history`, future ones) are
  fully usable on their viewer pages via the real MP login flow.
- Each viewer page doubles as an honest bare-host check of the shipped bundle
  (real `loader.js` → manifest → immutable bundle, isolated from studio CSS/JS).

## Non-goals

- No changes to `cdn/`, the release CLI, `loader.js`, or `@perimeter/widget-runtime`.
- No new deployment target — the catalog rides the existing studio deploy.
- No auth for the catalog itself; the site stays public. Only the embedded
  widgets gate on MP sign-in.
- No listing of historical versions (the manifest only exposes the current one).

## Architecture

New top-level section in the studio SPA, under the existing `Layout` shell:

| Route            | Page                                              |
| ---------------- | ------------------------------------------------- |
| `/catalog`       | Catalog landing — card grid of released widgets   |
| `/catalog/:slug` | Viewer — live shipped embed, playground, snippet  |

Added in `studio/src/routes.tsx`; the sidebar nav (`lib/nav.ts` / `Sidebar`)
gains a Catalog group. The committed SPA-fallback rewrite in
`studio/vercel.json` already serves deep links (needed for the OAuth return).

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

- **Manifest entry with no repo definition** (stale/removed widget): render a
  reduced card (name + version, no playground, generic snippet).
- **Repo definition not in the manifest** (unreleased): not listed.
- The CDN base URL (`https://widgets.perimeter.org`) is a single exported
  constant so tests and any future staging host can override it.

## Units

### 1. Catalog data hook — `studio/src/lib/catalog.ts`

`useCatalog()` fetches the manifest and joins it with discovered definitions.

- **Interface:** returns `{ entries, isLoading, error, retry }` where each
  entry is `{ slug, version, definition? }` (definition absent for stale
  manifest entries). `example` filtered out. Entries sorted by slug.
- **Depends on:** `discovery.ts` (existing), `fetch`, the CDN base constant.
- Pure join/filter logic is a plain exported function so it unit-tests without
  fetch.
- Note: discovery's per-widget importers are lazy, so the hook awaits every
  released widget's `load()` to get its definition. "Definition absent" means
  *stale* only after loading completes; `isLoading` covers the interim.

### 2. Catalog landing — `studio/src/pages/CatalogPage.tsx`

Card grid from `useCatalog()`: widget display name, current version, auth
badge (`required` → "Sign-in required"; `optional` → "Personalized when
signed in"), one-line description, link to `/catalog/<slug>`. The description
source is **frontmatter in `docs/widgets/<slug>.mdx`** (`description:` key) —
today those files have no frontmatter, so this work adds it to the existing
widget MDX files; a widget without frontmatter simply shows no description. No live embeds on the grid (fast load,
no iframe fan-out). Manifest fetch failure → error banner with a retry button.

### 3. Shipped-bundle preview — `studio/src/components/CdnBundlePreview.tsx`

The live embed. A same-origin `srcdoc` iframe whose document is a minimal
bare host page:

```html
<script src="https://widgets.perimeter.org/loader.js" async></script>
<div data-perimeter-widget="<slug>" data-…="<overrides>"></div>
```

- Extends the existing `BuiltBundlePreview` pattern (`window.onerror` +
  script-`onerror` → `postMessage` to the parent → visible error banner
  instead of a silent blank frame), but is **prod-visible** (not
  `import.meta.env.DEV`-gated) and loads via the real loader → manifest →
  immutable bundle chain rather than a local `dist/` file.
- **Interface:** `{ slug, overrides, theme }` → renders the iframe; the
  srcdoc is regenerated (clean remount) whenever overrides/theme change.
  `data-theme="dark"` goes on the placeholder div. Values are
  JSON-escaped/attribute-escaped exactly as `BuiltBundlePreview` escapes its
  interpolations.
- Because the iframe is `srcdoc` (inherits the parent origin), the embedded
  widget shares style.perimeter.org's `localStorage` — which is what makes
  the MP login integration work with zero runtime changes.
- Existing `BuiltBundlePreview` is left as-is (dev-only, local dist); shared
  srcdoc/error-channel helpers may be extracted if the duplication is real,
  not preemptively.

### 4. Viewer page — `studio/src/pages/CatalogWidgetPage.tsx`

Composes, top to bottom:

1. **Sign-in panel** (only when `definition.auth !== 'none'`) — see unit 5.
2. **Live embed** — `CdnBundlePreview` with current playground overrides.
3. **Config playground** — the existing zod-driven `ConfigPanel`
   (`describeSchemaFields`) bound to local override state; includes a
   dark-mode toggle. Overrides feed both the preview and the snippet.
4. **Embed snippet** — copyable, always current:

   ```html
   <script src="https://widgets.perimeter.org/loader.js" data-nowprocket async></script>
   <div data-perimeter-widget="<slug>" data-…="non-default overrides"></div>
   ```

   Only non-default override values are emitted as `data-*` attributes
   (camelCase → kebab-case, same mapping as the runtime's data-attr parser).
5. **Docs links** — plain links (no MDX rendering here) to the widget's
   studio page (`/widgets/<slug>`), which already renders the widget's docs.

Unknown slug or unreleased widget → the existing `NotFoundPage`. Stale
manifest entry (no definition) → embed + generic snippet, no playground, and
no sign-in panel (auth mode unknown).

### 5. MP login panel — `studio/src/components/MpLoginPanel.tsx`

Renders the **default MP login widget**, the same one perimeter.org runs:

```html
<script id="MPWidgets" src="https://ministryplatform.perimeter.org/widgets/dist/MPWidgets.js"></script>
<mpp-user-login></mpp-user-login>
```

- **Script injection:** a small `ensureMpWidgetsScript()` helper appends the
  script tag to `document.head` once (keyed on the `MPWidgets` id, the id the
  MP loader itself requires), lazily — only when a viewer page with
  `auth !== 'none'` mounts. Never loaded on other routes (the bundle is
  ~690 KB).
- **Element:** the `<mpp-user-login>` custom element rendered directly in JSX
  (React 19 handles custom elements). MP's OAuth flow redirects to
  `ministryplatform.perimeter.org` and returns to the exact
  `/catalog/<slug>` URL (carried in the OAuth `state` param). This return-URL
  behavior is the **one external assumption** in this design (observed from
  perimeter.org's live flow, not controlled by this repo) — validate it first
  during implementation.
- **Token flow (no new auth code):** on sign-in, MPWidgets writes
  `mpp-widgets_AuthToken` / `mpp-widgets_ExpiresAfter` to
  style.perimeter.org `localStorage`. The widget inside the srcdoc iframe
  shares that origin; its `MPLocalStorageAuth` (1s poll + storage events)
  picks the token up and the runtime `AuthGate` unlocks. Sign-out is MP's own
  logout button, which the widgets likewise observe.
- **Presentation by mode:** `required` → prominent panel above the embed,
  copy: "This widget requires a signed-in Perimeter account." (the embed
  below shows the runtime's built-in "Please sign in" gate until then);
  `optional` → compact secondary panel: "Sign in to see personalized data."
- **Failure:** if `MPWidgets.js` fails to load (script `onerror`), show an
  inline notice linking to https://www.perimeter.org/my-perimeter/ as the
  fallback sign-in location.
- The MP platform origin (`https://ministryplatform.perimeter.org`) is a
  single exported constant next to the CDN base constant.

## Error handling summary

| Failure | Behavior |
| --- | --- |
| Manifest fetch fails | Landing: banner + retry. Viewer: same banner in place of the embed. |
| Bundle fails to load/run in iframe | postMessage error channel → visible banner in the frame (existing pattern). |
| `MPWidgets.js` fails to load | Inline notice + perimeter.org sign-in link; embed still renders its own gate. |
| Unknown slug | `NotFoundPage`. |
| Stale manifest entry | Reduced card/viewer (no playground, no sign-in panel). |

## Testing

Unit tests (happy-dom, existing studio patterns; manifest fetch mocked):

- `catalog.ts`: join/filter logic — manifest ∩ definitions, `example`
  excluded, stale-entry entries carry no definition, sort order.
- Snippet generation: only non-default overrides emitted; camelCase →
  kebab-case; attribute escaping; `data-theme` inclusion.
- `CdnBundlePreview`: srcdoc contains loader URL + placeholder div with the
  right attributes; regenerates on override change; error message renders on
  a posted failure (mirror of the error-channel tests in
  `BuiltBundlePreview.test.tsx`).
- `CatalogWidgetPage`: sign-in panel rendered for `required`/`optional`, not
  for `none`; `ensureMpWidgetsScript` injects exactly once across mounts.
- `CatalogPage`: cards render from a mocked manifest; error banner + retry on
  fetch failure.

Visual: one Playwright spec in the existing studio visual harness covering
`/catalog` and one viewer route (axe + snapshot), consistent with current
specs.

Manual smoke (deployed site): open `/catalog/my-shepherds`, sign in via the
real MP widget, watch the shipped bundle unlock and render live data; verify
the OAuth round-trip returns to the viewer page; copy the snippet onto an
embed-lab page and confirm it matches.

## Deployment note

The catalog ships with the normal studio build — no new infra. As of mid-June
the style.perimeter.org Vercel project was still an owner-pending setup step
(`docs/deploying-studio.md`); the full e2e MP OAuth check needs that deployed
origin. Local dev works throughout (`pnpm dev`, real CDN + real MP script),
with the caveat that MP OAuth returns to `localhost` only if MP allows it —
otherwise sign in on the deployed site.
