"use client";

import * as React from "react";
import { useCombobox, useMultipleSelection, type Environment } from "downshift";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MultiComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
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

export type MultiComboboxProps =
  | MultiComboboxSingleProps
  | MultiComboboxMultipleProps;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function MultiCombobox(props: MultiComboboxProps) {
  const {
    options,
    placeholder = "Select...",
    selectedLabel,
    disabled = false,
    className,
    environment,
  } = props;
  const isMultiple = props.multiple === true;

  // Controlled vs uncontrolled state
  const isControlled = props.value !== undefined;
  const [internalValue, setInternalValue] = React.useState<
    string | string[] | null
  >(() => {
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
      if (isMultiple) {
        (props as MultiComboboxMultipleProps).onValueChange?.(
          newValue as string[],
        );
      } else {
        (props as MultiComboboxSingleProps).onValueChange?.(
          newValue as string | null,
        );
      }
    },
    [isControlled, isMultiple, props],
  );

  const [inputValue, setInputValue] = React.useState("");

  // Filter options by search input
  const filteredOptions = React.useMemo(() => {
    if (!inputValue) return options;
    const lower = inputValue.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(lower));
  }, [options, inputValue]);

  // --- Selection helpers ---

  const selectedValues: string[] = isMultiple
    ? ((currentValue as string[] | undefined) ?? [])
    : (currentValue as string | null | undefined) != null
      ? [currentValue as string]
      : [];

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
    environment,
    onStateChange({ selectedItems: newSelectedItems, type }) {
      if (
        type ===
          useMultipleSelection.stateChangeTypes.SelectedItemKeyDownBackspace ||
        type ===
          useMultipleSelection.stateChangeTypes.SelectedItemKeyDownDelete ||
        type ===
          useMultipleSelection.stateChangeTypes.DropdownKeyDownBackspace ||
        type ===
          useMultipleSelection.stateChangeTypes.FunctionRemoveSelectedItem
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
    environment,
    itemToString: (item) => item?.label ?? "",
    selectedItem: null, // We manage selection ourselves
    isItemDisabled: (item) => !!item.disabled,
    stateReducer(_state, actionAndChanges) {
      const { changes, type } = actionAndChanges;
      switch (type) {
        case useCombobox.stateChangeTypes.InputKeyDownEnter:
        case useCombobox.stateChangeTypes.ItemClick:
          return {
            ...changes,
            // In multiple mode, keep menu open and input value after selection
            isOpen: isMultiple ? true : false,
            inputValue: isMultiple ? inputValue : "",
          };
        default:
          return changes;
      }
    },
    onSelectedItemChange({ selectedItem: newItem }) {
      if (newItem) {
        toggleItem(newItem);
        if (!isMultiple) {
          setInputValue("");
        }
      }
    },
    onInputValueChange({ inputValue: newValue }) {
      setInputValue(newValue ?? "");
    },
  });

  // --- Display label ---

  const compactLabel = selectedLabel ?? placeholder;

  const displayLabel = React.useMemo(() => {
    if (selectedItems.length === 0) return "";
    if (!isMultiple) return selectedItems[0]?.label ?? "";
    if (selectedItems.length === 1) return selectedItems[0]?.label ?? "";
    return `${compactLabel} (${selectedItems.length})`;
  }, [selectedItems, isMultiple, compactLabel]);

  const hasSelection = selectedItems.length > 0;

  const clearAll = React.useCallback(() => {
    handleValueChange(isMultiple ? [] : null);
    setInputValue("");
  }, [handleValueChange, isMultiple]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [triggerWidth, setTriggerWidth] = React.useState<number | undefined>();

  // Measure trigger width when dropdown opens
  React.useEffect(() => {
    if (isOpen && containerRef.current) {
      setTriggerWidth(containerRef.current.offsetWidth);
    }
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      data-slot="multi-combobox"
      className={cn("relative", className)}
    >
      {/* Trigger / Input */}
      <div
        className={cn(
          "flex w-fit items-center gap-1 rounded-lg border border-input bg-transparent text-sm transition-colors",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          "hover:border-ring/50 hover:bg-muted/30",
          disabled && "pointer-events-none opacity-50",
          isOpen && "border-ring ring-3 ring-ring/50",
        )}
      >
        <input
          {...getInputProps(
            getDropdownProps({
              disabled,
              placeholder: displayLabel || placeholder,
            }),
          )}
          className="h-8 min-w-[80px] flex-1 bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground"
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
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </button>
      </div>

      {/* Dropdown */}
      <ul
        {...getMenuProps()}
        className={cn(
          "absolute z-50 mt-1 max-h-60 w-full min-w-[var(--trigger-width)] overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
          !isOpen && "hidden",
        )}
        style={
          {
            "--trigger-width": triggerWidth ? `${triggerWidth}px` : "auto",
          } as React.CSSProperties
        }
      >
        {isOpen &&
          (filteredOptions.length === 0 ? (
            <li className="flex w-full justify-center py-2 text-center text-sm text-muted-foreground">
              No matches
            </li>
          ) : (
            filteredOptions.map((option, index) => {
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
                    "relative flex w-full cursor-default items-center gap-2 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none transition-colors duration-150",
                    "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                    option.disabled &&
                      "pointer-events-none opacity-40 line-through",
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
