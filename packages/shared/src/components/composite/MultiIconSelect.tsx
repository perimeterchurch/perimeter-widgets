/**
 * MultiIconSelect Component
 * Multi-select dropdown using Headless UI Listbox with checkmark indicators.
 * Reuses IconSelectOption type from IconSelect for consistency.
 * Button shows placeholder when nothing selected, "placeholder (N)" when N items selected.
 */

import {
    Listbox,
    ListboxButton,
    ListboxOption,
    ListboxOptions,
} from '@headlessui/react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../utils/cn';
import type { IconSelectOption } from './IconSelect';

export interface MultiIconSelectPreset<T extends string | number = string> {
    /** Display label for the preset */
    label: string;
    /** Icon rendered before the label */
    icon?: React.ReactNode;
    /** The set of individual values this preset represents */
    values: T[];
}

interface MultiIconSelectProps<T extends string | number = string> {
    value: T[];
    onChange: (value: T[]) => void;
    options: IconSelectOption<T>[];
    placeholder?: string;
    /** Icon shown next to the placeholder/label text */
    placeholderIcon?: React.ReactNode;
    /** Preset toggles rendered above options (e.g. "Unresolved" = multiple statuses) */
    presets?: MultiIconSelectPreset<T>[];
    fullWidth?: boolean;
    className?: string;
}

export function MultiIconSelect<T extends string | number = string>({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    placeholderIcon,
    presets,
    fullWidth = false,
    className,
}: MultiIconSelectProps<T>) {
    return (
        <Listbox value={value} onChange={onChange} multiple>
            <div className={cn('relative', fullWidth && 'w-full', className)}>
                <ListboxButton
                    className={cn(
                        'flex h-10 items-center gap-2 rounded-lg border px-3 py-2',
                        'bg-[var(--color-background)] text-sm',
                        'dark:bg-stone-900',
                        'transition-colors duration-200',
                        'border-[var(--color-input)] dark:border-stone-600',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/50 focus-visible:ring-offset-2',
                        'focus-visible:border-[var(--color-ring)]',
                        fullWidth ? 'w-full' : 'w-auto',
                    )}
                >
                    {placeholderIcon && (
                        <span className='flex shrink-0 items-center text-[var(--color-text-muted)] dark:text-stone-500'>
                            {placeholderIcon}
                        </span>
                    )}
                    <span
                        className={cn(
                            'flex-1 truncate text-left',
                            value.length === 0 ?
                                'text-[var(--color-text-muted)] dark:text-stone-500'
                            :   'text-[var(--color-foreground)] dark:text-stone-200',
                        )}
                    >
                        {value.length === 0 ?
                            placeholder
                        :   `${placeholder} (${value.length})`}
                    </span>
                    <ChevronDown className='h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)] dark:text-stone-500' />
                </ListboxButton>

                <ListboxOptions
                    transition
                    anchor='bottom start'
                    className={cn(
                        'z-[var(--z-dropdown,1000)]',
                        'w-[var(--button-width)] origin-top',
                        'rounded-lg bg-[var(--color-popover)] shadow-lg ring-1 ring-[var(--color-border)]',
                        'dark:bg-stone-900 dark:ring-stone-700',
                        'focus:outline-none',
                        'py-1',
                        'transition duration-200',
                        'data-[closed]:scale-95 data-[closed]:opacity-0',
                    )}
                >
                    {presets?.map((preset) => {
                        const presetSet = new Set(preset.values.map(String));
                        const valueSet = new Set(value.map(String));
                        const isActive =
                            presetSet.size > 0
                            && presetSet.size === valueSet.size
                            && [...presetSet].every((v) => valueSet.has(v));
                        return (
                            <button
                                key={`preset-${preset.label}`}
                                type='button'
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onChange(
                                        isActive ? [] : [...preset.values],
                                    );
                                }}
                                className={cn(
                                    'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm',
                                    'transition-colors duration-150',
                                    'text-[var(--color-popover-foreground)] dark:text-stone-200',
                                    'hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]',
                                    'dark:hover:bg-stone-800 dark:hover:text-stone-100',
                                )}
                            >
                                {preset.icon && (
                                    <span className='flex shrink-0 items-center'>
                                        {preset.icon}
                                    </span>
                                )}
                                <span
                                    className={cn(
                                        'flex-1 truncate text-left',
                                        isActive && 'font-medium',
                                    )}
                                >
                                    {preset.label}
                                </span>
                                {isActive && (
                                    <Check className='h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]' />
                                )}
                            </button>
                        );
                    })}
                    {presets && presets.length > 0 && (
                        <div className='my-1 border-t border-[var(--color-border)] dark:border-stone-700' />
                    )}
                    {options.map((option) => (
                        <ListboxOption
                            key={String(option.value)}
                            value={option.value}
                            className={cn(
                                'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm',
                                'transition-colors duration-150',
                                'text-[var(--color-popover-foreground)] dark:text-stone-200',
                                'data-[focus]:bg-[var(--color-accent)] data-[focus]:text-[var(--color-accent-foreground)]',
                                'dark:data-[focus]:bg-stone-800 dark:data-[focus]:text-stone-100',
                            )}
                        >
                            {({ selected: isSelected }) => (
                                <>
                                    {option.icon && (
                                        <span className='flex shrink-0 items-center'>
                                            {option.icon}
                                        </span>
                                    )}
                                    <span
                                        className={cn(
                                            'flex-1 truncate',
                                            isSelected && 'font-medium',
                                        )}
                                    >
                                        {option.label}
                                    </span>
                                    {isSelected && (
                                        <Check className='h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]' />
                                    )}
                                </>
                            )}
                        </ListboxOption>
                    ))}
                </ListboxOptions>
            </div>
        </Listbox>
    );
}
