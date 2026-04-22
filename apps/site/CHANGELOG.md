# Changelog

All notable changes to the Perimeter Style registry and showcase site.

Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- `container` prop on Dialog, Combobox, Select, DropdownMenu, and Tooltip for custom portal targets (shadow DOM support)
- `environment` prop on MultiCombobox for custom downshift environment (shadow DOM support)

### Fixed

- Progress bar not displaying in playground preview (missing `w-full` on root)
- Dropdown menu throwing error on click (missing `DropdownMenuGroup` wrapper for labels)
- Compare tab light panel showing dark-mode text when page is in dark mode
- Theme not persisting across page reloads (blocking script + hydration sync fix)
- Slider thumb hardcoded `bg-white` replaced with theme-aware `bg-background`
- `dark:` Tailwind variants leaking into `.light` scoped containers in Compare/Themes tabs
- Context menu demo labels missing required `ContextMenuGroup` wrapper
- Unused/unwired controls removed from context-menu and menubar demos
- README registry URL corrected from `perimeter.church` to `perimeter.org`

### Added

- Component showcase site with interactive playgrounds for all 55 components
- 5 full-page templates (dashboard, settings, login, data-table, marketing-landing)
- Design token reference page with grid and table views
- Theme switching between default, metrics, and perimeter-api themes
- Dark mode support via .dark class toggle
- Getting started documentation
- shadcn CLI-compatible registry at style.perimeter.org/r/
