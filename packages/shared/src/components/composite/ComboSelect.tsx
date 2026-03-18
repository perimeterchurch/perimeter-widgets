/**
 * ComboSelect Component
 * Generalized searchable combobox using Headless UI.
 * Supports single and multi-select via discriminated union props.
 * Features: search filtering, loading state, optional icons, "all" reset option.
 */

import { useState, useMemo, type ReactNode } from 'react';
import {
    Combobox,
    ComboboxButton,
    ComboboxInput,
    ComboboxOption,
    ComboboxOptions,
} from '@headlessui/react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

export interface ComboSelectOption<T extends string | number = string> {
    value: T;
    label: string;
    icon?: ReactNode;
}

interface ComboSelectBaseProps<T extends string | number = string> {
    options: ComboSelectOption<T>[];
    placeholder?: string;
    placeholderIcon?: ReactNode;
    fullWidth?: boolean;
    loading?: boolean;
    disabled?: boolean;
    /** Show a "clear/all" reset option */
    showAllOption?: boolean;
    allOptionLabel?: string;
    /** Text shown when no search results */
    emptyText?: string;
    className?: string;
}

interface ComboSelectSingleProps<
    T extends string | number = string,
> extends ComboSelectBaseProps<T> {
    multiple?: false;
    value: T | '';
    onChange: (value: T | '') => void;
}

interface ComboSelectMultipleProps<
    T extends string | number = string,
> extends ComboSelectBaseProps<T> {
    multiple: true;
    value: T[];
    onChange: (value: T[]) => void;
}

export type ComboSelectProps<T extends string | number = string> =
    | ComboSelectSingleProps<T>
    | ComboSelectMultipleProps<T>;

export function ComboSelect<T extends string | number = string>(
    props: ComboSelectProps<T>,
) {
    const {
        options,
        placeholder = 'Select...',
        placeholderIcon,
        fullWidth = false,
        loading = false,
        disabled = false,
        showAllOption = false,
        allOptionLabel = 'All',
        emptyText = 'No results found',
        className,
    } = props;

    const isMultiple = props.multiple === true;

    const [query, setQuery] = useState('');

    const allOptions: ComboSelectOption<T | ''>[] = useMemo(
        () => [
            ...(!isMultiple && showAllOption ?
                [{ value: '' as T | '', label: allOptionLabel }]
            :   []),
            ...options,
        ],
        [options, showAllOption, allOptionLabel, isMultiple],
    );

    const filtered = useMemo(() => {
        if (!query) return allOptions;
        const lower = query.toLowerCase();
        return allOptions.filter((o) => o.label.toLowerCase().includes(lower));
    }, [allOptions, query]);

    // Compute placeholder text
    const effectivePlaceholder = useMemo(() => {
        if (isMultiple) {
            const count = props.value.length;
            return count === 0 ? placeholder : `${placeholder} (${count})`;
        }
        const selected = allOptions.find(
            (o) => o.value === (props as ComboSelectSingleProps<T>).value,
        );
        return selected?.label || placeholder;
    }, [isMultiple, props, allOptions, placeholder]);

    // Shared inner content
    const innerContent = (
        <div className={cn('relative min-w-0', fullWidth && 'w-full')}>
            {/* Icon overlay (left) */}
            <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3'>
                {loading ?
                    <Loader2 className='h-3.5 w-3.5 animate-spin text-[var(--color-primary)]' />
                : placeholderIcon ?
                    <span className='flex items-center text-[var(--color-text-muted)] dark:text-stone-500'>
                        {placeholderIcon}
                    </span>
                :   null}
            </div>

            {/* Input */}
            <ComboboxInput
                className={cn(
                    'h-10 w-full rounded-lg border text-sm',
                    'bg-[var(--color-background)] dark:bg-stone-900',
                    'transition-colors duration-200',
                    'border-[var(--color-input)] dark:border-stone-600',
                    'text-[var(--color-foreground)] dark:text-stone-200',
                    'placeholder:text-[var(--color-text-muted)] dark:placeholder:text-stone-500',
                    'focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/50 focus:ring-offset-2',
                    'focus:border-[var(--color-ring)]',
                    placeholderIcon || loading ? 'pl-8' : 'pl-3',
                    'pr-8',
                    loading && 'opacity-70',
                    className,
                )}
                placeholder={effectivePlaceholder}
                displayValue={() => query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') e.currentTarget.blur();
                }}
            />

            {/* Chevron overlay (right) */}
            <ComboboxButton className='absolute inset-y-0 right-0 flex items-center pr-3'>
                <ChevronDown className='h-3.5 w-3.5 text-[var(--color-text-muted)] dark:text-stone-500' />
            </ComboboxButton>

            <ComboboxOptions
                anchor={{ to: 'bottom start', gap: 4 }}
                transition
                className={cn(
                    'z-[var(--z-dropdown,1000)] w-[var(--input-width)] origin-top',
                    'max-h-60 overflow-y-auto',
                    'rounded-lg bg-[var(--color-popover)] shadow-lg ring-1 ring-[var(--color-border)]',
                    'dark:bg-stone-900 dark:ring-stone-700',
                    'focus:outline-none',
                    'py-1',
                    'transition duration-200',
                    'data-[closed]:scale-95 data-[closed]:opacity-0',
                )}
            >
                {filtered.length === 0 ?
                    <div className='px-3 py-2 text-sm text-[var(--color-text-muted)] dark:text-stone-500'>
                        {emptyText}
                    </div>
                :   filtered.map((option) => (
                        <ComboboxOption
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
                        </ComboboxOption>
                    ))
                }
            </ComboboxOptions>
        </div>
    );

    if (isMultiple) {
        return (
            <Combobox
                value={(props as ComboSelectMultipleProps<T>).value}
                onChange={(val) => {
                    (props as ComboSelectMultipleProps<T>).onChange(val);
                    setQuery('');
                }}
                multiple
                immediate
                disabled={disabled || loading}
            >
                {innerContent}
            </Combobox>
        );
    }

    const singleValue = (props as ComboSelectSingleProps<T>).value;
    const singleOnChange = (props as ComboSelectSingleProps<T>).onChange;

    return (
        <Combobox
            value={singleValue as string}
            onChange={(val: string | null) => {
                singleOnChange((val ?? '') as T | '');
                setQuery('');
            }}
            immediate
            disabled={disabled || loading}
        >
            {innerContent}
        </Combobox>
    );
}
