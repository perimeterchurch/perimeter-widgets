# Portal Container Prop Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional `container` prop to 5 Base UI portal components and `environment` prop to multi-combobox, enabling shadow DOM mounting without consumer-side component forks.

**Architecture:** Each Base UI component's content wrapper gets a `container` prop that passes through to the Portal primitive. Multi-combobox gets an `environment` prop that passes through to downshift hooks. All props default to `undefined` (no behavior change for existing consumers).

**Tech Stack:** @base-ui/react, downshift, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-09-portal-container-prop-design.md`

---

## File Map

| Action | File                                       | Change                                                            |
| ------ | ------------------------------------------ | ----------------------------------------------------------------- |
| Modify | `registry/ui/perimeter/dialog.tsx`         | Add `container` to `DialogPortal` and thread from `DialogContent` |
| Modify | `registry/ui/perimeter/combobox.tsx`       | Add `container` to `ComboboxContent` → Portal                     |
| Modify | `registry/ui/perimeter/select.tsx`         | Add `container` to `SelectContent` → Portal                       |
| Modify | `registry/ui/perimeter/dropdown-menu.tsx`  | Add `container` to `DropdownMenuContent` → Portal                 |
| Modify | `registry/ui/perimeter/tooltip.tsx`        | Add `container` to `TooltipContent` → Portal                      |
| Modify | `registry/ui/perimeter/multi-combobox.tsx` | Add `environment` to `MultiCombobox` → downshift hooks            |

---

## Chunk 0: Setup

### Task 0: Create feature branch

- [ ] **Step 1: Create branch off dev**

```bash
cd /Users/parkerb/dev/perimeter/claude/style
git checkout dev && git pull
git checkout -b feat/portal-container-prop
```

---

## Chunk 1: Base UI Portal Components

### Task 1: Add container prop to Dialog

**Files:**

- Modify: `/Users/parkerb/dev/perimeter/claude/style/registry/ui/perimeter/dialog.tsx`

- [ ] **Step 1: Update DialogPortal to accept container**

In `dialog.tsx`, change `DialogPortal` (line 18-20):

Before:

```tsx
function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}
```

After:

```tsx
function DialogPortal({ container, ...props }: DialogPrimitive.Portal.Props) {
  return (
    <DialogPrimitive.Portal
      data-slot="dialog-portal"
      container={container}
      {...props}
    />
  );
}
```

Note: `container` is already part of `DialogPrimitive.Portal.Props` — no type intersection needed.

- [ ] **Step 2: Thread container through DialogContent**

`DialogContent` renders `<DialogPortal>` internally. Read the function to find where `DialogPortal` is rendered, then add `container` to `DialogContent`'s props and pass it through.

Find the `DialogContent` function signature (around line 42) and add `container` to the destructured props:

Before:

```tsx
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
}) {
```

After:

```tsx
function DialogContent({
  className,
  children,
  showCloseButton = true,
  container,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
  container?: HTMLElement;
}) {
```

Then find where `<DialogPortal>` is rendered inside `DialogContent` and pass the `container` prop:

Before:

```tsx
    <DialogPortal>
```

After:

```tsx
    <DialogPortal container={container}>
```

- [ ] **Step 3: Run typecheck**

Run: `cd /Users/parkerb/dev/perimeter/claude/style && pnpm typecheck`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/style
git add registry/ui/perimeter/dialog.tsx
git commit -m "feat(dialog): add container prop for portal target"
```

---

### Task 2: Add container prop to Combobox, Select, Dropdown Menu, Tooltip

**Files:**

- Modify: `/Users/parkerb/dev/perimeter/claude/style/registry/ui/perimeter/combobox.tsx`
- Modify: `/Users/parkerb/dev/perimeter/claude/style/registry/ui/perimeter/select.tsx`
- Modify: `/Users/parkerb/dev/perimeter/claude/style/registry/ui/perimeter/dropdown-menu.tsx`
- Modify: `/Users/parkerb/dev/perimeter/claude/style/registry/ui/perimeter/tooltip.tsx`

These 4 components follow the same pattern: the `*Content` function renders `<*Primitive.Portal>` inline. Add `container` to the content function's props and pass it to Portal.

- [ ] **Step 1: Update ComboboxContent**

In `combobox.tsx`, find `ComboboxContent` (line 87). Add `container` to its destructured props:

```tsx
function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  container,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
  > & { container?: HTMLElement }) {
```

Then change `<ComboboxPrimitive.Portal>` (line 101) to:

```tsx
    <ComboboxPrimitive.Portal container={container}>
```

- [ ] **Step 2: Update SelectContent**

In `select.tsx`, find `SelectContent` (line 59). Add `container` to its destructured props:

```tsx
function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  container,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  > & { container?: HTMLElement }) {
```

Then change `<SelectPrimitive.Portal>` (line 74) to:

```tsx
    <SelectPrimitive.Portal container={container}>
```

- [ ] **Step 3: Update DropdownMenuContent**

In `dropdown-menu.tsx`, find `DropdownMenuContent` (line 21). Add `container`:

```tsx
function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  container,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  > & { container?: HTMLElement }) {
```

Then change `<MenuPrimitive.Portal>` (line 34) to:

```tsx
    <MenuPrimitive.Portal container={container}>
```

Note: `DropdownMenuSubContent` calls `DropdownMenuContent` and passes through all props, so `container` propagates automatically.

- [ ] **Step 4: Update TooltipContent**

In `tooltip.tsx`, find `TooltipContent` (line 28). Add `container`:

```tsx
function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  container,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  > & { container?: HTMLElement }) {
```

Then change `<TooltipPrimitive.Portal>` (line 42) to:

```tsx
    <TooltipPrimitive.Portal container={container}>
```

- [ ] **Step 5: Run typecheck**

Run: `cd /Users/parkerb/dev/perimeter/claude/style && pnpm typecheck`
Expected: No type errors.

- [ ] **Step 6: Run quality**

Run: `cd /Users/parkerb/dev/perimeter/claude/style && pnpm quality`
Expected: All checks pass.

- [ ] **Step 7: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/style
git add registry/ui/perimeter/combobox.tsx registry/ui/perimeter/select.tsx registry/ui/perimeter/dropdown-menu.tsx registry/ui/perimeter/tooltip.tsx
git commit -m "feat(combobox,select,dropdown-menu,tooltip): add container prop for portal target"
```

---

## Chunk 2: Multi-Combobox + Registry Build

### Task 3: Add environment prop to MultiCombobox

**Files:**

- Modify: `/Users/parkerb/dev/perimeter/claude/style/registry/ui/perimeter/multi-combobox.tsx`

- [ ] **Step 1: Add environment to MultiComboboxBaseProps**

In `multi-combobox.tsx`, find `MultiComboboxBaseProps` (line 19). Add the `environment` prop:

```tsx
interface MultiComboboxBaseProps {
  /** Available options */
  options: MultiComboboxOption[];
  /** Placeholder text when nothing is selected */
  placeholder?: string;
  /** Short label shown when items are selected (e.g., "Fruits"). Falls back to placeholder. */
  selectedLabel?: string;
  /** Disable the entire combobox */
  disabled?: boolean;
  /** Additional class names for the root container */
  className?: string;
  /** Custom environment for shadow DOM support (passed to downshift hooks) */
  environment?: {
    addEventListener: typeof window.addEventListener;
    removeEventListener: typeof window.removeEventListener;
    document: Document;
    Node: typeof Node;
  };
}
```

- [ ] **Step 2: Destructure environment and pass to hooks**

In the `MultiCombobox` function (line 60), add `environment` to the destructured props:

```tsx
function MultiCombobox(props: MultiComboboxProps) {
  const {
    options,
    placeholder = "Select...",
    selectedLabel,
    disabled = false,
    className,
    environment,
  } = props;
```

Then find `useMultipleSelection({` (around line 145) and add `environment`:

```tsx
  const { getDropdownProps } = useMultipleSelection({
    selectedItems,
    environment,
    onStateChange({ selectedItems: newSelectedItems, type }) {
```

Then find `useCombobox({` (around line 174) and add `environment`:

```tsx
  } = useCombobox({
    items: filteredOptions,
    inputValue,
    environment,
    itemToString: (item) => item?.label ?? "",
```

- [ ] **Step 3: Run typecheck**

Run: `cd /Users/parkerb/dev/perimeter/claude/style && pnpm typecheck`
Expected: No type errors. If downshift's `Environment` type doesn't match our inline type, import it from downshift and use it instead.

- [ ] **Step 4: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/style
git add registry/ui/perimeter/multi-combobox.tsx
git commit -m "feat(multi-combobox): add environment prop for shadow DOM support"
```

---

### Task 4: Build registry and verify

**Files:**

- No new files — generates `public/r/*.json`

- [ ] **Step 1: Build the registry**

Run: `cd /Users/parkerb/dev/perimeter/claude/style && pnpm registry:build`
Expected: Registry builds successfully, updates JSON files in `public/r/`.

- [ ] **Step 2: Verify updated components in registry output**

Check that the 6 updated component JSON files include the new props in their source:

Run: `grep -l "container" public/r/dialog.json public/r/combobox.json public/r/select.json public/r/dropdown-menu.json public/r/tooltip.json`
Expected: All 5 files listed (they contain the `container` prop in their `content` field).

Run: `grep "environment" public/r/multi-combobox.json`
Expected: Shows the `environment` prop in the content.

- [ ] **Step 3: Run full quality**

Run: `cd /Users/parkerb/dev/perimeter/claude/style && pnpm quality`
Expected: All checks pass.

- [ ] **Step 4: Update CHANGELOG.md**

Add an entry under the `[Unreleased]` section in `CHANGELOG.md`:

```markdown
### Added

- `container` prop on Dialog, Combobox, Select, DropdownMenu, and Tooltip for custom portal targets (shadow DOM support)
- `environment` prop on MultiCombobox for custom downshift environment (shadow DOM support)
```

- [ ] **Step 5: Commit registry build and changelog**

```bash
cd /Users/parkerb/dev/perimeter/claude/style
git add public/r/ CHANGELOG.md
git commit -m "chore: rebuild registry with portal container props"
```
