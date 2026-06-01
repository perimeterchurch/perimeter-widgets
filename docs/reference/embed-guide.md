# Widget Embed Guide

> **Scope:** WordPress embed patterns, data attributes, loading states, multiple widgets
> **Last verified:** 2026-03-18

---

## Basic Embed

Every widget embed follows the same two-element pattern:

```html
<!-- 1. Target element with config -->
<div data-perimeter-widget="<name>" data-option="value"></div>

<!-- 2. Widget script (loads and auto-mounts) -->
<script src="https://widgets.perimeter.org/<name>/latest.js" async></script>
```

The widget script finds its target element, reads data attributes as config, and mounts a React app inside a shadow DOM. No manual initialization or config objects required.

`…/latest.js` always resolves (via the `cdn/manifest.json` pointer) to the current released version. To pin an immutable build, point the script straight at a versioned bundle: `https://widgets.perimeter.org/<name>/<version>/index.js`.

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
<script src="https://widgets.perimeter.org/sermons/latest.js" async></script>
```

---

## Multiple Widgets on One Page

Each widget bundles its own React and creates its own shadow DOM and QueryClient. Multiple widgets on the same page work independently with no conflicts:

```html
<!-- Sermons widget -->
<div data-perimeter-widget="sermons"></div>
<script src="https://widgets.perimeter.org/sermons/latest.js" async></script>

<!-- Future: Giving widget -->
<div data-perimeter-widget="giving" data-campaign="general-fund"></div>
<script src="https://widgets.perimeter.org/giving/latest.js" async></script>
```

Each widget is ~72KB gzipped. Immutable, year-cached versioned bundles make repeat page visits instant.

---

## Style Isolation

Widgets render inside a shadow DOM (`mode: 'open'`). This means:

- WordPress theme CSS does **not** affect widget styles
- Widget styles do **not** leak into the WordPress page
- Each widget injects its own Tailwind CSS into its shadow root
- The `:host` selector resets inherited styles (font, color, line-height)

---

## Data Attributes

Data attributes on the target element configure the widget:

| Pattern                          | Conversion                               | Example            |
| -------------------------------- | ---------------------------------------- | ------------------ |
| `data-default-tab="series"`      | String: `{ defaultTab: 'series' }`       | Enum value         |
| `data-per-page="12"`             | Number: `{ perPage: 12 }`                | Items per page     |
| `data-hide-search="true"`        | Boolean: `{ hideSearch: true }`          | Toggle feature     |
| `data-api-url="http://..."`      | String: `{ apiUrl: 'http://...' }`       | API override (dev) |

Kebab-case attributes are auto-converted to camelCase. Numbers and booleans are auto-parsed.

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
