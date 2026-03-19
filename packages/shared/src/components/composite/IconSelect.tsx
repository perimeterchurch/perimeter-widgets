/**
 * IconSelect Component
 * Custom select dropdown using Headless UI Listbox that supports icons in options.
 * Use instead of native <Select> when options need visual indicators (colored dots, icons, etc).
 *
 * Uses CSS custom property tokens (not dark: variants) for shadow DOM compatibility.
 */

import {
    Listbox,
    ListboxButton,
    ListboxOption,
    ListboxOptions,
} from '@headlessui/react';
import { ChevronDown, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface IconSelectOption<T extends string | number = string> {
    value: T;
    label: string;
    icon?: ReactNode;
}

interface IconSelectProps<T extends string | number = string> {
    value: T;
    onChange: (value: T) => void;
    options: IconSelectOption<T>[];
    placeholder?: string;
    fullWidth?: boolean;
    className?: string;
}

export function IconSelect<T extends string | number = string>({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    fullWidth = false,
    className,
}: IconSelectProps<T>) {
    const selected = options.find((o) => o.value === value);

    return (
        <Listbox value={value} onChange={onChange}>
            <div className={cn('relative', fullWidth && 'w-full', className)}>
                <ListboxButton
                    className={cn(
                        'flex h-10 items-center gap-2 rounded-lg border px-3 py-2',
                        'bg-[var(--color-background)] text-sm',
                        'transition-colors duration-200',
                        'border-[var(--color-input)]',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/50 focus-visible:ring-offset-2',
                        'focus-visible:border-[var(--color-ring)]',
                        fullWidth ? 'w-full' : 'w-auto',
                    )}
                >
                    {selected ?
                        <>
                            {selected.icon && (
                                <span className='flex shrink-0 items-center'>
                                    {selected.icon}
                                </span>
                            )}
                            <span className='flex-1 truncate text-left text-[var(--color-foreground)]'>
                                {selected.label}
                            </span>
                        </>
                    :   <span className='flex-1 truncate text-left text-[var(--color-text-muted)]'>
                            {placeholder}
                        </span>
                    }
                    <ChevronDown className='h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]' />
                </ListboxButton>

                <ListboxOptions
                    transition
                    className={cn(
                        'absolute left-0 top-full z-[var(--z-dropdown,1000)] mt-1 w-full origin-top',
                        'rounded-lg bg-[var(--color-popover)] shadow-lg ring-1 ring-[var(--color-border)]',
                        'focus:outline-none',
                        'py-1',
                        'transition duration-200',
                        'data-[closed]:scale-95 data-[closed]:opacity-0',
                    )}
                >
                    {options.map((option) => (
                        <ListboxOption
                            key={String(option.value)}
                            value={option.value}
                            className={cn(
                                'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm',
                                'transition-colors duration-150',
                                'text-[var(--color-popover-foreground)]',
                                'data-[focus]:bg-[var(--color-accent)] data-[focus]:text-[var(--color-accent-foreground)]',
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
