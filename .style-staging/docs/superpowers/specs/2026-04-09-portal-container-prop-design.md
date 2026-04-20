# Portal Container Prop for Shadow DOM Support

> **Date:** 2026-04-09
> **Scope:** style project — 6 registry components that use portals
> **Consumer:** perimeter-widgets (shadow DOM mounting)

---

## Context

Six components in the style registry use portal primitives to render overlays (dialogs, dropdowns, tooltips) outside their parent DOM tree. By default, these portal to `document.body`. This breaks when components are mounted inside a shadow DOM because styles and events don't cross the shadow boundary.

perimeter-widgets currently maintains custom copies of these 6 components with `usePortalContainer()` injected. Adding an optional `container` prop to the style versions eliminates this duplication — widgets can pass the shadow root container at the usage site.

## Components to Update

### Base UI Portal Components (5)

These all follow the same pattern — add `container` prop to the Portal primitive:

| Component     | File                                      | Portal Primitive           | Content Wrapper       |
| ------------- | ----------------------------------------- | -------------------------- | --------------------- |
| Dialog        | `registry/ui/perimeter/dialog.tsx`        | `DialogPrimitive.Portal`   | `DialogContent`       |
| Combobox      | `registry/ui/perimeter/combobox.tsx`      | `ComboboxPrimitive.Portal` | `ComboboxContent`     |
| Select        | `registry/ui/perimeter/select.tsx`        | `SelectPrimitive.Portal`   | `SelectContent`       |
| Dropdown Menu | `registry/ui/perimeter/dropdown-menu.tsx` | `MenuPrimitive.Portal`     | `DropdownMenuContent` |
| Tooltip       | `registry/ui/perimeter/tooltip.tsx`       | `TooltipPrimitive.Portal`  | `TooltipContent`      |

**Change pattern for Combobox, Select, Dropdown Menu, Tooltip:**

These 4 components render `Portal` inline inside their content wrapper. Add `container` prop to the content wrapper and pass through:

```tsx
// Before
function SelectContent({ className, ...props }) {
  return <SelectPrimitive.Portal>...</SelectPrimitive.Portal>;
}

// After
function SelectContent({ className, container, ...props }) {
  return (
    <SelectPrimitive.Portal container={container}>...</SelectPrimitive.Portal>
  );
}
```

**Change pattern for Dialog (different architecture):**

Dialog has a separate `DialogPortal` wrapper function that `DialogContent` calls. Add `container` to `DialogPortal`:

```tsx
// Before
function DialogPortal({ ...props }) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

// After
function DialogPortal({ container, ...props }) {
  return (
    <DialogPrimitive.Portal
      data-slot="dialog-portal"
      container={container}
      {...props}
    />
  );
}
```

Then thread `container` through `DialogContent` → `DialogPortal`.

**Note on DropdownMenu:** `DropdownMenuSubContent` renders via `DropdownMenuContent`, so the `container` prop propagates to sub-menus automatically.

**Props:**

- `container` is `HTMLElement | undefined`
- When `undefined` (default), Base UI portals to `document.body` — no behavior change
- When set, portals to that element (e.g., shadow root mount point)
- This is a non-breaking, additive change

### Multi-Combobox (downshift — 1)

| Component      | File                                       | Library     | Integration Point                            |
| -------------- | ------------------------------------------ | ----------- | -------------------------------------------- |
| Multi-Combobox | `registry/ui/perimeter/multi-combobox.tsx` | `downshift` | `useCombobox` + `useMultipleSelection` hooks |

**Change:** Add optional `environment` prop to `MultiCombobox` that passes through to downshift's `useCombobox` and `useMultipleSelection` hooks.

```tsx
// Before
function MultiCombobox({ options, ... }) {
    const { ... } = useCombobox({ ... });
}

// After
function MultiCombobox({ options, environment, ... }) {
    const { ... } = useCombobox({ ..., environment });
    const { ... } = useMultipleSelection({ ..., environment });
}
```

- `environment` matches downshift's `Environment` type (object with `addEventListener`, `removeEventListener`, `document`, `Node`)
- When `undefined` (default), downshift uses `window` — no behavior change
- Consumers construct the environment object (e.g., perimeter-widgets builds a shadow DOM proxy)
- This is a non-breaking, additive change

## Implementation Order

1. Update 5 Base UI components (identical pattern, can batch)
2. Update multi-combobox (different pattern)
3. Build registry: `pnpm registry:build`
4. Verify showcase site still works: `pnpm dev`
5. Commit and deploy

## Testing

- Style project has no component unit tests — verification is visual via the showcase site
- Run `pnpm quality` (typecheck + lint + format)
- Verify each component's demo page renders correctly in the showcase
- The `container` prop is purely passthrough to Base UI which already supports it

## Out of Scope

- Phase 2: syncing updated components into perimeter-widgets (separate task)
- Adding `usePortalContainer` to the style project (widget-specific concern)
- Tests for shadow DOM behavior (tested in perimeter-widgets)
