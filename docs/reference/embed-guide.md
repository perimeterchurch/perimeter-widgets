# Widget Embed Guide

> **Scope:** WordPress embed patterns, data attributes, loading states, multiple widgets
> **Last verified:** 2026-03-17

---

## Basic Embed

Every widget embed follows the same two-element pattern:

```html
<!-- 1. Target element with config -->
<div id="perimeter-<name>" data-option="value"></div>

<!-- 2. Widget script (loads and auto-mounts) -->
<script src="https://cdn.jsdelivr.net/gh/PerimeterChurch/perimeter-widgets@latest/dist/<name>/<name>.js"></script>
```

The widget script finds the target element by ID, reads data attributes as config, and mounts a React app inside a shadow DOM. No manual initialization or config objects required.

---

## Loading Placeholder

Add lightweight placeholder HTML inside the target element to prevent a blank gap while the script loads:

```html
<div id="perimeter-sermons" data-campus="buckhead">
    <div
        style="min-height:200px;background:#f5f5f4;border-radius:8px;animation:pulse 2s infinite"
    ></div>
</div>
```

The placeholder is replaced when the widget mounts.

---

## Available Widgets

| Widget  | Element ID          | Script Path               |
| ------- | ------------------- | ------------------------- |
| Sermons | `perimeter-sermons` | `dist/sermons/sermons.js` |

---

## Full Sermons Example

```html
<div id="perimeter-sermons" data-campus="buckhead" data-per-page="12">
    <div style="min-height:200px;background:#f5f5f4;border-radius:8px"></div>
</div>
<script src="https://cdn.jsdelivr.net/gh/PerimeterChurch/perimeter-widgets@latest/dist/sermons/sermons.js"></script>
```

---

## Multiple Widgets on One Page

Each widget bundles its own React and creates its own shadow DOM and QueryClient. Multiple widgets on the same page work independently with no conflicts:

```html
<!-- Sermons widget -->
<div id="perimeter-sermons" data-campus="buckhead"></div>
<script src="https://cdn.jsdelivr.net/gh/PerimeterChurch/perimeter-widgets@latest/dist/sermons/sermons.js"></script>

<!-- Future: Giving widget -->
<div id="perimeter-giving" data-campaign="general-fund"></div>
<script src="https://cdn.jsdelivr.net/gh/PerimeterChurch/perimeter-widgets@latest/dist/giving/giving.js"></script>
```

Each widget is ~72KB gzipped. CDN caching makes repeat page visits instant.

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

| Pattern                     | Conversion                         | Example            |
| --------------------------- | ---------------------------------- | ------------------ |
| `data-campus="buckhead"`    | String: `{ campus: 'buckhead' }`   | Filter by campus   |
| `data-per-page="12"`        | Number: `{ perPage: 12 }`          | Items per page     |
| `data-show-filters="true"`  | Boolean: `{ showFilters: true }`   | Toggle feature     |
| `data-api-url="http://..."` | String: `{ apiUrl: 'http://...' }` | API override (dev) |

Kebab-case attributes are auto-converted to camelCase. Numbers and booleans are auto-parsed.

---

## Common Data Attributes (all widgets)

| Attribute      | Type   | Default                     | Description                             |
| -------------- | ------ | --------------------------- | --------------------------------------- |
| `data-api-url` | string | `https://api.perimeter.org` | Override API base URL (for dev/staging) |

---

## Troubleshooting

### Widget doesn't appear

1. Check the element ID matches exactly (e.g., `perimeter-sermons`)
2. Check the script URL is correct and accessible
3. Open browser DevTools → Console for errors
4. Check DevTools → Elements to see if a shadow root was created

### Styles look wrong

1. The widget uses shadow DOM — WordPress styles should not affect it
2. Check that the widget script loaded (look for the `<style>` tag inside the shadow root)
3. If using a content security policy, ensure `style-src 'unsafe-inline'` is allowed (shadow DOM injects `<style>` tags)

### Widget shows stale content

jsDelivr caches `@latest` for up to 7 days. After a new build:

1. The GitHub Action auto-purges the cache
2. If purge hasn't propagated, append `?v=<timestamp>` to the script URL as a temporary workaround

---

## Related Docs

- [CDN & Deployment](../architecture/cdn-deployment.md) — How scripts are served
- [Architecture Overview](../architecture/overview.md) — Shadow DOM mounting details
