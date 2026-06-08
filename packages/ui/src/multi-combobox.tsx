import * as React from 'react';
import { useCombobox, useMultipleSelection, type Environment } from 'downshift';
import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react';

import { cn } from './utils/cn';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MultiComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
  /**
   * Render this option as a non-interactive group header (e.g. an OT/NT
   * testament divider) rather than a selectable row. Headers are skipped by
   * keyboard navigation and selection.
   */
  isGroupHeader?: boolean;
}

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
  environment?: Environment;
  /** Controlled open state. Omit for uncontrolled. */
  isOpen?: boolean;
  /** Called when the popover open state changes (in either controlled or uncontrolled mode) */
  onOpenChange?: (isOpen: boolean) => void;
}

interface MultiComboboxSingleProps extends MultiComboboxBaseProps {
  multiple?: false;
  /** Current value (controlled). Omit for uncontrolled. */
  value?: string | null;
  /** Initial value (uncontrolled). Ignored when `value` is provided. */
  defaultValue?: string | null;
  /** Called when selection changes */
  onValueChange?: (value: string | null) => void;
}

interface MultiComboboxMultipleProps extends MultiComboboxBaseProps {
  multiple: true;
  /** Current values (controlled). Omit for uncontrolled. */
  value?: string[];
  /** Initial values (uncontrolled). Ignored when `value` is provided. */
  defaultValue?: string[];
  /** Called when selection changes */
  onValueChange?: (value: string[]) => void;
}

export type MultiComboboxProps = MultiComboboxSingleProps | MultiComboboxMultipleProps;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Derive a downshift `Environment` from the component's root node so its
 * click-outside / blur listeners attach in the right context inside a shadow
 * DOM. When the combobox is mounted in a shadow root, events retarget at the
 * shadow boundary; downshift's `Environment` lets us hand it the owning window's
 * listeners and document instead of assuming the top-level globals. Mirrors the
 * established `getRootNode()` pattern in `use-click-outside.ts` and the sermons
 * VideoPlayer. Returns `undefined` in the light DOM so downshift uses its
 * defaults.
 */
function deriveEnvironment(node: HTMLElement | null): Environment | undefined {
  const root = node?.getRootNode();
  if (!root || !(root instanceof ShadowRoot)) return undefined;
  const view = root.ownerDocument.defaultView;
  if (!view) return undefined;
  return {
    addEventListener: view.addEventListener.bind(view),
    removeEventListener: view.removeEventListener.bind(view),
    document: root.ownerDocument,
    Node: view.Node,
  };
}

function MultiCombobox(props: MultiComboboxProps) {
  const {
    options,
    placeholder = 'Select...',
    selectedLabel,
    disabled = false,
    className,
    environment: environmentProp,
  } = props;
  const isMultiple = props.multiple === true;

  const containerRef = React.useRef<HTMLDivElement>(null);
  // An explicit `environment` prop wins (lets callers override); otherwise
  // derive it ONCE from our own root node so shadow-DOM mounts work with no
  // plumbing. `deriveEnvironment` returns a fresh object literal each call, so we
  // must NOT compare it by reference against the stored value or feed the stored
  // value back into the effect deps — that would loop forever in a shadow root
  // (new object !== old object on every render => setState => re-render => …).
  // The root node identity is stable after mount, so a single post-mount
  // derivation is correct; the `didDerive` ref makes it run exactly once.
  const didDeriveRef = React.useRef(false);
  const [derivedEnvironment, setDerivedEnvironment] = React.useState<Environment | undefined>(
    undefined,
  );
  React.useEffect(() => {
    if (environmentProp !== undefined || didDeriveRef.current) return;
    didDeriveRef.current = true;
    const next = deriveEnvironment(containerRef.current);
    if (next !== undefined) setDerivedEnvironment(next);
  }, [environmentProp]);
  const environment = environmentProp ?? derivedEnvironment;

  // Controlled vs uncontrolled state
  const isControlled = props.value !== undefined;
  const [internalValue, setInternalValue] = React.useState<string | string[] | null>(() => {
    if (isControlled) return props.value ?? (isMultiple ? [] : null);
    if (props.defaultValue !== undefined) return props.defaultValue;
    return isMultiple ? [] : null;
  });

  const currentValue = isControlled ? props.value : internalValue;

  const handleValueChange = React.useCallback(
    (newValue: string | string[] | null) => {
      if (!isControlled) {
        setInternalValue(newValue);
      }
      if (props.multiple === true) {
        props.onValueChange?.(newValue as string[]);
      } else {
        props.onValueChange?.(newValue as string | null);
      }
    },
    [isControlled, props],
  );

  const [inputValue, setInputValue] = React.useState('');

  // Filter options by search input
  const filteredOptions = React.useMemo(() => {
    if (!inputValue) return options;
    const lower = inputValue.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(lower));
  }, [options, inputValue]);

  // --- Selection helpers ---

  // Memoized so downstream useCallback/useMemo deps stay stable across
  // renders when the underlying value didn't change.
  const selectedValues = React.useMemo<string[]>(
    () =>
      isMultiple
        ? ((currentValue as string[] | undefined) ?? [])
        : (currentValue as string | null | undefined) != null
          ? [currentValue as string]
          : [],
    [isMultiple, currentValue],
  );

  const isSelected = React.useCallback(
    (value: string) => selectedValues.includes(value),
    [selectedValues],
  );

  const toggleItem = React.useCallback(
    (option: MultiComboboxOption) => {
      if (isMultiple) {
        const current = (currentValue as string[] | undefined) ?? [];
        const next = current.includes(option.value)
          ? current.filter((v) => v !== option.value)
          : [...current, option.value];
        handleValueChange(next);
      } else {
        const current = currentValue as string | null | undefined;
        handleValueChange(current === option.value ? null : option.value);
      }
    },
    [isMultiple, currentValue, handleValueChange],
  );

  // --- Downshift multiple selection hook (chips) ---

  const selectedItems = React.useMemo(
    () => options.filter((o) => selectedValues.includes(o.value)),
    [options, selectedValues],
  );

  const { getDropdownProps } = useMultipleSelection({
    selectedItems,
    ...(environment !== undefined && { environment }),
    onStateChange({ selectedItems: newSelectedItems, type }) {
      if (
        type === useMultipleSelection.stateChangeTypes.SelectedItemKeyDownBackspace ||
        type === useMultipleSelection.stateChangeTypes.SelectedItemKeyDownDelete ||
        type === useMultipleSelection.stateChangeTypes.DropdownKeyDownBackspace ||
        type === useMultipleSelection.stateChangeTypes.FunctionRemoveSelectedItem
      ) {
        if (isMultiple && newSelectedItems) {
          handleValueChange(newSelectedItems.map((i) => i.value));
        }
      }
    },
  });

  // --- Downshift combobox hook ---

  const {
    isOpen,
    highlightedIndex,
    getInputProps,
    getToggleButtonProps,
    getMenuProps,
    getItemProps,
  } = useCombobox({
    items: filteredOptions,
    inputValue,
    ...(environment !== undefined && { environment }),
    itemToString: (item) => item?.label ?? '',
    selectedItem: null, // We manage selection ourselves
    // Group headers are non-selectable dividers, so they must be skipped by
    // keyboard nav and click selection even if the caller didn't also set
    // `disabled` — enforce the documented `isGroupHeader` contract here rather
    // than relying on every caller to remember to pair the two flags.
    isItemDisabled: (item) => !!item.disabled || !!item.isGroupHeader,
    ...(props.isOpen !== undefined && { isOpen: props.isOpen }),
    onIsOpenChange: ({ isOpen: nextIsOpen }) => props.onOpenChange?.(nextIsOpen ?? false),
    stateReducer(_state, actionAndChanges) {
      const { changes, type } = actionAndChanges;
      switch (type) {
        case useCombobox.stateChangeTypes.InputKeyDownEnter:
        case useCombobox.stateChangeTypes.ItemClick:
          return {
            ...changes,
            // In multiple mode, keep menu open and input value after selection
            isOpen: isMultiple ? true : false,
            inputValue: isMultiple ? inputValue : '',
          };
        default:
          return changes;
      }
    },
    onSelectedItemChange({ selectedItem: newItem }) {
      if (newItem) {
        toggleItem(newItem);
        if (!isMultiple) {
          setInputValue('');
        }
      }
    },
    onInputValueChange({ inputValue: newValue }) {
      setInputValue(newValue ?? '');
    },
  });

  // --- Display label ---

  const compactLabel = selectedLabel ?? placeholder;

  const displayLabel = React.useMemo(() => {
    if (selectedItems.length === 0) return '';
    if (!isMultiple) return selectedItems[0]?.label ?? '';
    if (selectedItems.length === 1) return selectedItems[0]?.label ?? '';
    return `${compactLabel} (${selectedItems.length})`;
  }, [selectedItems, isMultiple, compactLabel]);

  const hasSelection = selectedItems.length > 0;

  const clearAll = React.useCallback(() => {
    handleValueChange(isMultiple ? [] : null);
    setInputValue('');
  }, [handleValueChange, isMultiple]);

  const [triggerWidth, setTriggerWidth] = React.useState<number | undefined>();

  // Measure trigger width when dropdown opens
  React.useEffect(() => {
    if (isOpen && containerRef.current) {
      setTriggerWidth(containerRef.current.offsetWidth);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} data-slot="multi-combobox" className={cn('relative', className)}>
      {/* Trigger / Input */}
      <div
        className={cn(
          'flex w-fit items-center gap-1 rounded-lg border border-border bg-transparent text-sm transition-colors',
          'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
          'hover:border-ring/50 hover:bg-muted/30',
          disabled && 'pointer-events-none opacity-50',
          isOpen && 'border-ring ring-3 ring-ring/50',
        )}
      >
        <input
          {...getInputProps(
            getDropdownProps({
              disabled,
              placeholder: displayLabel || placeholder,
            }),
          )}
          className="h-8 min-w-[80px] flex-1 bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-fg"
        />

        {hasSelection && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearAll();
            }}
            className="flex items-center px-1 opacity-50 hover:opacity-100"
            aria-label="Clear selection"
          >
            <XIcon className="size-3.5" />
          </button>
        )}

        <button
          {...getToggleButtonProps({ disabled })}
          type="button"
          aria-label="toggle menu"
          className="flex items-center px-2"
        >
          <ChevronDownIcon
            className={cn('size-4 text-muted-fg transition-transform', isOpen && 'rotate-180')}
          />
        </button>
      </div>

      {/* Dropdown */}
      <ul
        {...getMenuProps()}
        className={cn(
          'absolute z-50 mt-1 max-h-60 w-full min-w-[var(--trigger-width)] overflow-y-auto rounded-lg bg-bg p-1 text-fg shadow-md ring-1 ring-fg/10',
          !isOpen && 'hidden',
        )}
        style={
          {
            '--trigger-width': triggerWidth ? `${triggerWidth}px` : 'auto',
          } as React.CSSProperties
        }
      >
        {isOpen &&
          (filteredOptions.length === 0 ? (
            <li className="flex w-full justify-center py-2 text-center text-sm text-muted-fg">
              No matches
            </li>
          ) : (
            filteredOptions.map((option, index) => {
              // Group headers are non-interactive dividers (e.g. "Old Testament"):
              // render them as a header row, not a selectable/strikethrough item.
              // They stay in downshift's `items` (so indices line up) but
              // `isItemDisabled` returns true for `isGroupHeader`, so keyboard nav
              // and click selection skip them.
              if (option.isGroupHeader) {
                return (
                  <li
                    key={option.value}
                    role="presentation"
                    className="px-1.5 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-fg uppercase select-none first:pt-1"
                  >
                    {option.label}
                  </li>
                );
              }
              const selected = isSelected(option.value);
              return (
                <li
                  key={option.value}
                  {...getItemProps({
                    item: option,
                    index,
                  })}
                  data-highlighted={highlightedIndex === index || undefined}
                  data-selected={selected || undefined}
                  className={cn(
                    'relative flex w-full cursor-default items-center gap-2 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none transition-colors duration-150',
                    'data-highlighted:bg-accent data-highlighted:text-accent-fg',
                    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                    option.disabled && 'pointer-events-none opacity-40',
                  )}
                >
                  {option.label}
                  {selected && (
                    <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                      <CheckIcon className="size-4" />
                    </span>
                  )}
                </li>
              );
            })
          ))}
      </ul>
    </div>
  );
}

export { MultiCombobox };
