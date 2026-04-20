# Style Project Audit Fixes & Feature Improvements

Date: 2026-03-30

## Overview

Comprehensive audit fixes and feature additions for the Perimeter Style project, organized into three tiers: bug fixes & doc cleanup, polish & SEO, and new features.

## Tier 1 — Bug Fixes & Doc Cleanup

### Stale Documentation Paths

Update all `registry/new-york/ui/` references to `registry/ui/perimeter/` in:

- `docs/architecture/registry.md`
- `docs/guides/adding-a-component.md`

Standardize all registry URLs to `https://style.perimeter.org/r/{name}.json` in:

- `docs/guides/consuming.md`
- `docs/guides/project-integration.md`
- `docs/architecture/registry.md`
- `registry.json` homepage field → `https://style.perimeter.org`
- `scripts/generate-registry.ts` homepage constant
- `src/app/docs/getting-started/page.tsx` URL references

### Missing Doc References

Remove from `docs/README.md`:

- `architecture/theme-editor.md` (project pivoted from theme editor to component showcase)
- `guides/creating-a-theme.md` (will be recreated in Tier 3)

### ROADMAP.md Updates

- Move "Component showcase site" to Completed
- Update "High Priority" deploy target from GitHub Pages to Vercel
- Update custom domain to `style.perimeter.org`

### Theme Persistence

File: `src/lib/theme-context.tsx`

Add localStorage read/write:

- On mount: read `perimeter-style-theme` and `perimeter-style-mode` from localStorage
- On change: write to localStorage in the same effect that updates DOM attributes
- Fallback to defaults ("" for theme, "light" for mode) if localStorage is empty

### Broken Template Component Links

File: `src/app/templates/[slug]/page.tsx`

Fix component badge links:

- Import the demo manifest via `import manifest from "@/lib/demo-manifest.json"`
- For each component name in a template's `meta.components`, look up its category from the manifest by matching on `slug`
- Link to `/components/{category}/{slug}` instead of `/components`
- Fallback: if a component name has no manifest match, link to `/components` (current behavior) to avoid broken links

### Error Boundaries

Add `error.tsx` files at:

- `src/app/error.tsx` — root error boundary
- `src/app/components/error.tsx` — components section
- `src/app/templates/error.tsx` — templates section
- `src/app/tokens/error.tsx` — tokens section

Each displays "Something went wrong" with the error message and a "Try again" button that calls `reset()`.

### Dynamic Import Error Handling

File: `src/components/site/component-playground.tsx`

Add `.catch()` handler to the dynamic import promise. Set an error state that displays a message instead of infinite "Loading...".

### Hardcoded File Paths

Fix relative `readFileSync` / `readdirSync` calls to use `join(process.cwd(), ...)`:

- `src/app/tokens/page.tsx`: `readFileSync("registry/themes/default.json", ...)` → `join(process.cwd(), "registry", "themes", "default.json")`
- `src/app/layout.tsx`: `readdirSync("registry/themes")` → `join(process.cwd(), "registry", "themes")`

### Duplicate Snippet Logic

Extract shared snippet-building function:

- Create `src/lib/build-snippet.ts` exporting `buildSnippet(componentName: string, controls: ControlsConfig, values: Record<string, unknown>): string`
- Consolidates the nearly identical `buildPlaygroundSnippet` (component detail page) and `buildCodeSnippet` (playground) into one function
- Both files import from `@/lib/build-snippet` instead of defining their own

### ESLint Warnings

Remove unused `_props` parameters from:

- `registry/ui/perimeter/context-menu.demo.tsx`
- `registry/ui/perimeter/menubar.demo.tsx`

These Playground functions don't use props — remove the parameter entirely.

## Tier 2 — Polish & SEO

### Page Metadata

Enhance existing metadata exports with `description` and `openGraph` fields. Some pages already have `title` — add the missing fields without duplicating what exists:

| Route                            | Description source                           |
| -------------------------------- | -------------------------------------------- |
| `/` (home)                       | Static: "Perimeter Church design system..."  |
| `/components/`                   | Static: "Browse 55 components..."            |
| `/components/[category]/`        | Category name                                |
| `/components/[category]/[slug]/` | Demo manifest `description` field            |
| `/templates/`                    | Static: "Full-page template compositions..." |
| `/templates/[slug]/`             | Template `meta.description` field            |
| `/tokens/`                       | Static: "Design token reference..."          |
| `/docs/*`                        | Static per-page descriptions                 |

OpenGraph fields: `title`, `description`, `type: "website"`, `siteName: "Perimeter Style"`.

### Sitemap & robots.txt

New script: `scripts/generate-sitemap.ts`

- Reads demo manifest for component routes
- Reads template entries for template routes
- Scans `src/app/docs/` for `page.tsx` files to derive doc routes (filesystem-driven, not hardcoded, so new docs are automatically included)
- Outputs `public/sitemap.xml` with all routes under `https://style.perimeter.org`

New file: `public/robots.txt`

```
User-agent: *
Allow: /
Sitemap: https://style.perimeter.org/sitemap.xml
```

Add `pnpm generate:sitemap` script to `package.json`. Add to build pipeline after `collect:demos`.

### Skip-to-Content

File: `src/app/layout.tsx`

Add as first child of `<body>`:

```tsx
<a
  href="#main"
  className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground"
>
  Skip to content
</a>
```

Add `id="main"` to the main content wrapper.

### Favicon Placeholder

Create `docs/guides/favicon.md` with instructions:

- Where to place icon files (`public/favicon.ico`, `public/icon.svg`, `public/apple-touch-icon.png`)
- How to update metadata in `src/app/layout.tsx` (the `icons` field in metadata export)
- Recommended sizes and formats

### Loading Skeletons

File: `src/components/site/component-playground.tsx`

Replace "Loading..." text with a skeleton layout:

- Preview area: rounded rectangle skeleton matching the preview pane dimensions
- Controls sidebar: 3-4 skeleton rows matching control heights
- Use the existing Skeleton component from the registry

### Search Palette Completeness

File: `src/components/site/search-palette.tsx`

The palette already includes Tokens and Getting Started. Add the missing items:

- New doc pages: `/docs/theming/`, `/docs/contributing/`, `/docs/troubleshooting/`
- Changelog page: `/changelog`

### Accessibility Improvements

**Token swatches:** Add `aria-label` to color swatch elements in `token-grid.tsx` and `token-table.tsx` with format: `"{token-name}: {value}"`.

**Search palette focus:** Return focus to the search trigger element when the palette closes. Use a ref on the trigger and call `.focus()` in the close handler.

**Playground tabs:** Add `aria-label="Component playground"` to the tab container.

## Tier 3 — New Features

### Token Search & Filter

File: `src/components/site/token-page-client.tsx`

Add a toolbar above the grid/table toggle:

- Text input for search (filters tokens by name, matches substring)
- Button group for category filter: "All" plus categories derived from the `TOKEN_GROUPS` array in `src/lib/token-usage.ts` (dynamically generated, not hardcoded)
- Filters apply to both grid and table views
- State is local component state (no URL params)
- Empty state when no tokens match: "No tokens matching '{query}'"

### Copy Theme JSON

File: `src/components/site/token-page-client.tsx` (or a new `copy-theme-button.tsx`)

Add a "Copy JSON" button in the tokens page header:

- Reads the current theme's token data (passed from server component via props)
- Serializes to formatted JSON
- Copies to clipboard using the same pattern as `copy-install-button.tsx`
- Shows "Copied!" feedback briefly

### Component Usage Snippets

File: `src/app/components/[category]/[slug]/page.tsx`

Add a "Usage" section between the install command and the playground:

- Import statement: `import { ComponentName } from "@/components/ui/{slug}"`
- JSX example: auto-generated from the demo's default control values using `build-snippet.ts`
- Rendered in a CodeBlock with the install button pattern
- Always in sync because it derives from the same demo data

### Bidirectional Cross-References

**Template → Component (fix + enhance):**

File: `src/app/templates/[slug]/page.tsx`

- Import demo manifest
- For each component in `meta.components`, find its category from manifest
- Render as linked badges to `/components/{category}/{slug}`

**Component → Template:**

File: `src/app/components/[category]/[slug]/page.tsx`

- Import template entries from `src/templates/index.ts`
- Filter templates whose `meta.components` array includes this component's name
- Render a "Used in Templates" section with linked cards/badges to `/templates/{slug}`
- Only render the section if there are matching templates

### Responsive Preview

File: `src/components/site/component-playground.tsx`

Add a toolbar row to the Preview tab:

- Preset buttons: Mobile (375px), Tablet (768px), Desktop (1280px), Full (100%)
- Draggable resize handle on the right edge of the preview container
- Preview container gets `max-width` constraint and centers horizontally
- Current width label displayed (e.g., "375px")
- Use a lightweight pointer-event drag handler for the resize handle (no new dependencies). `react-resizable-panels` is already installed but designed for panel layouts, not single-edge resize — a simpler approach fits better here
- "Full" resets to 100% width with no constraint

### Compare Tab (Dark Mode Side-by-Side)

File: `src/components/site/component-playground.tsx`

Add a "Compare" tab alongside "Preview" and "Code". Wire into the existing `activeTab`/`setActiveTab` state pattern with the same show/hide approach (opacity/height transitions):

- Renders two instances of the loaded component
- Left pane: light mode (no `.dark` class)
- Right pane: dark mode (`.dark` class applied to wrapper)
- Both share the same controls state
- Side-by-side at 50% width with a subtle divider
- Labels: "Light" and "Dark" above each pane
- Responsive: stack vertically on narrow viewports

### Themes Tab

File: `src/components/site/component-playground.tsx`

Add a "Themes" tab:

- Reads available themes via `useTheme().availableThemes` from the existing theme context
- Renders the component once per theme in a vertical stack
- Each instance wrapped in a `<div data-theme="{slug}">` scoped container
- All instances share the same controls state
- Theme name label above each instance
- Shows both light and dark for each theme (2 columns × N themes grid)

### Changelog (Hybrid)

**Manual file:** Create `CHANGELOG.md` at project root in Keep a Changelog format:

```markdown
# Changelog

All notable changes to the Perimeter Style registry and showcase site.

## [Unreleased]

### Added

- (initial entry summarizing current state)
```

**Route:** Create `src/app/changelog/page.tsx`:

- Server component that reads `CHANGELOG.md` directly via `readFileSync` at build time (same pattern as tokens page)
- Renders the parsed markdown sections (no separate build script needed — the page itself is the parser/renderer)
- Parses Keep a Changelog structure into sections with version, date, and categorized entries

**Navigation:**

- Add "Changelog" link to top nav in `top-nav.tsx`
- Add to search palette items
- Add metadata (title, description, og tags)

**CLAUDE.md rule:** Add to Critical Rules section:

> Update `CHANGELOG.md` under the `[Unreleased]` section when making user-facing changes to components, themes, templates, or the showcase site.

### Docs Expansion

Create three new guide files and corresponding routes:

**`docs/guides/creating-a-theme.md`** (~250 words):

- Create a JSON file in `registry/themes/`
- Token override structure (only override what differs from default)
- Light and dark mode values
- Run `pnpm generate:themes` to inject CSS
- Link to `registry/themes/default.json` for full token list

**`docs/guides/contributing.md`** (~250 words):

- Clone and `pnpm install`
- Dev server: `pnpm dev`
- Branch workflow (create branch, never commit to main/dev)
- Quality checks: `pnpm quality`
- Demo file conventions (link to `src/lib/demo-types.ts`)
- Registry build after component changes

**`docs/guides/troubleshooting.md`** (~200 words):

- Turbopack hang → use `pnpm dev` (already uses --webpack)
- Stale registry → run `pnpm registry:build`
- Theme not applying → check `data-theme` attribute on `<html>`
- Demo not showing → run `pnpm collect:demos`
- Build fails → check TypeScript errors with `pnpm typecheck`

**Routes:**

- `src/app/docs/theming/page.tsx` — renders creating-a-theme guide content
- `src/app/docs/contributing/page.tsx` — renders contributing guide content
- `src/app/docs/troubleshooting/page.tsx` — renders troubleshooting guide content

**Update:**

- `docs/README.md` — add all three to the index
- `src/components/site/docs-sidebar.tsx` — add navigation links
- `src/components/site/search-palette.tsx` — add to search items

## Build Pipeline Changes

Updated build command in `package.json`:

```
"build": "pnpm registry:build && pnpm generate:themes && pnpm collect:demos && pnpm generate:sitemap && next build"
```

New script:

```
"generate:sitemap": "tsx scripts/generate-sitemap.ts"
```

## Files Created

| File                                    | Purpose                                      |
| --------------------------------------- | -------------------------------------------- |
| `src/lib/build-snippet.ts`              | Shared snippet-building logic                |
| `src/app/error.tsx`                     | Root error boundary                          |
| `src/app/components/error.tsx`          | Components error boundary                    |
| `src/app/templates/error.tsx`           | Templates error boundary                     |
| `src/app/tokens/error.tsx`              | Tokens error boundary                        |
| `scripts/generate-sitemap.ts`           | Sitemap generator                            |
| `public/robots.txt`                     | Crawler directives                           |
| `docs/guides/favicon.md`                | Favicon setup instructions                   |
| `docs/guides/creating-a-theme.md`       | Theme creation guide                         |
| `docs/guides/contributing.md`           | Contributing guide                           |
| `docs/guides/troubleshooting.md`        | Troubleshooting guide                        |
| `src/app/docs/theming/page.tsx`         | Theming docs route                           |
| `src/app/docs/contributing/page.tsx`    | Contributing docs route                      |
| `src/app/docs/troubleshooting/page.tsx` | Troubleshooting docs route                   |
| `src/app/changelog/page.tsx`            | Changelog page (reads CHANGELOG.md directly) |
| `CHANGELOG.md`                          | Manual changelog file                        |

## Files Modified

| File                                            | Changes                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| `docs/architecture/registry.md`                 | Fix paths to `registry/ui/perimeter/`                                          |
| `docs/guides/adding-a-component.md`             | Fix paths to `registry/ui/perimeter/`                                          |
| `docs/guides/consuming.md`                      | Standardize URL to `style.perimeter.org`                                       |
| `docs/guides/project-integration.md`            | Standardize URL to `style.perimeter.org`                                       |
| `docs/README.md`                                | Remove missing files, add new guides                                           |
| `ROADMAP.md`                                    | Update status of completed/in-progress items                                   |
| `CLAUDE.md`                                     | Add changelog update rule                                                      |
| `registry.json`                                 | Update homepage URL                                                            |
| `scripts/generate-registry.ts`                  | Update homepage constant                                                       |
| `src/lib/theme-context.tsx`                     | Add localStorage persistence                                                   |
| `src/app/templates/[slug]/page.tsx`             | Fix component links, add manifest lookup                                       |
| `src/app/tokens/page.tsx`                       | Fix hardcoded path, pass theme data to client                                  |
| `src/components/site/component-playground.tsx`  | Add error handling, skeleton, responsive preview, Compare tab, Themes tab      |
| `src/components/site/token-page-client.tsx`     | Add search/filter toolbar, copy theme button                                   |
| `src/components/site/token-grid.tsx`            | Add aria-labels to swatches                                                    |
| `src/components/site/token-table.tsx`           | Add aria-labels to swatches                                                    |
| `src/components/site/search-palette.tsx`        | Add tokens, docs, changelog to items                                           |
| `src/components/site/top-nav.tsx`               | Add changelog link                                                             |
| `src/components/site/docs-sidebar.tsx`          | Add new doc links                                                              |
| `src/app/layout.tsx`                            | Add skip-to-content, main id                                                   |
| `src/app/page.tsx`                              | Add metadata                                                                   |
| `src/app/components/page.tsx`                   | Add metadata                                                                   |
| `src/app/components/[category]/page.tsx`        | Add metadata                                                                   |
| `src/app/components/[category]/[slug]/page.tsx` | Add metadata, usage snippet, "Used in Templates" section, use build-snippet.ts |
| `src/app/templates/page.tsx`                    | Add metadata                                                                   |
| `src/app/tokens/page.tsx`                       | Add metadata                                                                   |
| `src/app/docs/getting-started/page.tsx`         | Fix URLs, add metadata                                                         |
| `package.json`                                  | Add generate:sitemap script, update build command                              |
| `registry/ui/perimeter/context-menu.demo.tsx`   | Remove unused \_props                                                          |
| `registry/ui/perimeter/menubar.demo.tsx`        | Remove unused \_props                                                          |
