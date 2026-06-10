# Widget Embed Guide

> **Scope:** WordPress embed patterns, data attributes, loading states, multiple widgets
> **Canonical source:** [`docs/hosting-and-release.md`](../hosting-and-release.md) (Embedding)

---

## Basic Embed

There are two embed shapes. The recommended one uses the global loader:

```html
<!-- Loader (once per page) — resolves and injects the current versioned bundle.
     data-nowprocket opts the tag out of WP Rocket's "Delay JavaScript Execution"
     (harmless everywhere else) — see "Caching & optimization plugins" below. -->
<script src="https://widgets.perimeter.org/loader.js" data-nowprocket async></script>

<!-- Target element with config (one per widget instance) -->
<div data-perimeter-widget="<name>" data-option="value"></div>
```

The loader fetches `manifest.json`, scans the page for `[data-perimeter-widget="<name>"]` targets, and injects each used widget's immutable versioned bundle once (deduped by name). Each widget reads its `data-*` attributes as config and mounts a React app inside a shadow root. Unknown widget names are skipped silently.

To pin a single immutable build (no loader), point a script straight at a versioned bundle:

```html
<div data-perimeter-widget="<name>"></div>
<script src="https://widgets.perimeter.org/<name>/<version>/index.js" data-nowprocket async></script>
```

`…/<name>/latest.js` is also available (a manifest-derived rewrite that always resolves to the current released version) for an auto-updating single-script embed.

---

## Loading Placeholder

Add lightweight placeholder HTML inside the target element to prevent a blank gap while the script loads:

```html
<div data-perimeter-widget="sermons">
    <div
        style="min-height:200px;background:#f5f5f4;border-radius:8px;animation:pulse 2s infinite"
    ></div>
</div>
```

The placeholder is replaced when the widget mounts.

---

## Available Widgets

| Widget  | `data-perimeter-widget` | Script URL                                       |
| ------- | ----------------------- | ------------------------------------------------ |
| Sermons | `sermons`               | `https://widgets.perimeter.org/sermons/latest.js` |

---

## Full Sermons Example

```html
<div
    data-perimeter-widget="sermons"
    data-per-page="12"
    data-default-tab="sermons"
    data-default-view="grid"
>
    <div style="min-height:200px;background:#f5f5f4;border-radius:8px"></div>
</div>
<script src="https://widgets.perimeter.org/sermons/latest.js" data-nowprocket async></script>
```

---

## Multiple Widgets on One Page

Each widget bundles its own React and creates its own shadow DOM and QueryClient. Multiple widgets on the same page work independently with no conflicts. With the loader, one `<script>` covers every widget on the page:

```html
<script src="https://widgets.perimeter.org/loader.js" data-nowprocket async></script>

<div data-perimeter-widget="sermons"></div>
<div data-perimeter-widget="giving" data-campaign="general-fund"></div>
```

Immutable, year-cached versioned bundles make repeat page visits instant. Per-widget bundle sizes are enforced by each widget's `tests/bundle.test.ts` budget.

---

## Style Isolation

Widgets render inside a shadow DOM (`mode: 'open'`). This means:

- WordPress theme CSS does **not** affect widget styles
- Widget styles do **not** leak into the WordPress page
- Each widget injects its own Tailwind CSS into its shadow root
- The `:host` selector resets inherited styles (font, color, line-height)

---

## Caching & Optimization Plugins (WP Rocket, Autoptimize)

WordPress performance plugins rewrite script tags, and one feature is a verified
widget-killer:

**WP Rocket "Delay JavaScript Execution"** defers **every** script — inline and external —
until the visitor interacts with the page (mousemove, touch, scroll, keydown), with no
timeout fallback. With the loader delayed, the widget renders nothing until interaction,
and **never renders for a visitor who loads the page and leaves without interacting**. Our
loader is not on WP Rocket's built-in exclusion list, so a default Delay JS rollout breaks
the embed silently.

Two layers of defense, both vendor-supported:

1. **Ship the snippet with `data-nowprocket`** (already included in every snippet in this
   guide). WP Rocket skips any script tag carrying the `nowprocket` keyword; the attribute
   is inert everywhere else. Scripts the loader injects at runtime are not rewritten, so
   guarding the loader tag (or the direct/`latest.js` tag) covers the whole chain.
2. **Add an admin-side exclusion** in WP Rocket → File Optimization → *Excluded JavaScript
   Files*, in case a page builder or copy-paste strips the attribute:

   ```
   widgets.perimeter.org
   ```

**Autoptimize caveat:** with WP Rocket Delay JS *and* Autoptimize's "Aggregate JS files"
both enabled, delayed scripts (which WP Rocket rewrites to look empty) can be aggregated
and stripped from the page entirely. Autoptimize ships with JS aggregation off — leave it
off, or exclude `widgets.perimeter.org` there as well.

Other common optimizations are safe: the embed scripts are already `async`, bundles are
immutable and year-cached, and minify/defer settings don't change the loader's behavior.

---

## Data Attributes

Data attributes on the target element configure the widget:

| Pattern                          | Conversion                               | Example            |
| -------------------------------- | ---------------------------------------- | ------------------ |
| `data-default-tab="series"`      | String: `{ defaultTab: 'series' }`       | Enum value         |
| `data-per-page="12"`             | Number: `{ perPage: 12 }`                | Items per page     |
| `data-hide-search="true"`        | Boolean: `{ hideSearch: true }`          | Toggle feature     |
| `data-api-url="http://..."`      | String: `{ apiUrl: 'http://...' }`       | API override (dev) |
| `data-theme="dark"`              | Activates the dark palette (see below)   | Light/dark         |

Kebab-case attributes are auto-converted to camelCase. Numbers and booleans are auto-parsed.

---

## Dark Mode

Widgets default to the light palette. Add `data-theme="dark"` to a target element to render that embed in dark mode:

```html
<div data-perimeter-widget="sermons" data-theme="dark"></div>
```

Dark mode is a CSS-variable swap — the widget's per-instance token sheet emits a `:host { … }` (light) block and a `:host([data-theme="dark"]) { … }` (dark) block, and the attribute activates the dark block on the shadow host. Any widget styled with semantic token utilities cascades automatically; no per-embed color attributes are needed. Omit `data-theme` (the default) for light. The canonical reference is [`docs/hosting-and-release.md`](../hosting-and-release.md) (Embedding → Dark mode).

---

## Common Data Attributes (all widgets)

| Attribute      | Type   | Default                     | Description                             |
| -------------- | ------ | --------------------------- | --------------------------------------- |
| `data-api-url` | string | `https://api.perimeter.org` | Override API base URL (for dev/staging) |

---

## Troubleshooting

### Widget doesn't appear

1. Check the `data-perimeter-widget` value matches the widget name exactly (e.g., `sermons`)
2. Check the script URL is correct and accessible
3. Open browser DevTools → Console for errors
4. Check DevTools → Elements to see if a shadow root was created

### Widget appears only after moving the mouse / scrolling (or never)

That is the WP Rocket "Delay JavaScript Execution" signature — the embed script is being
held until user interaction. Confirm with DevTools → Elements: a delayed tag shows
`type="rocketlazyloadscript"` with the real URL stashed in `data-rocket-src`. Fix: make
sure the script tag carries `data-nowprocket` and/or add `widgets.perimeter.org` to WP
Rocket's *Excluded JavaScript Files* (see "Caching & Optimization Plugins" above).

### Styles look wrong

1. The widget uses shadow DOM — WordPress styles should not affect it
2. Check that the widget script loaded (look for the `<style>` tag inside the shadow root)
3. If using a content security policy, ensure `style-src 'unsafe-inline'` is allowed (shadow DOM injects `<style>` tags)

### Widget shows stale content

Versioned bundle URLs (`…/<name>/<version>/index.js`) are immutable and year-cached — they never go stale and need no manual cache-busting (`?v=…` query strings are unnecessary). The `latest.js` rewrite and `manifest.json` are short-lived at the edge (`s-maxage=60` + `stale-while-revalidate`), so after a release (a merged `manifest.json` change) `latest.js` consumers pick up the new version within ~a minute. If a page still looks stale after that, hard-refresh to clear the browser cache.

---

## Related Docs

- [CDN & Deployment](../architecture/cdn-deployment.md) — How scripts are served
- [Hosting & Release](../hosting-and-release.md) — Canonical hosting, release, and embed reference
- [Architecture Overview](../architecture/overview.md) — Shadow DOM mounting details
