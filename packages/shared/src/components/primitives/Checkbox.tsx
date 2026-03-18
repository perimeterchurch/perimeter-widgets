/**
 * Checkbox Component
 * Checkbox input with custom styling and accessibility features
 */

import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from 'react';
import type { BaseComponentProps, Size } from '../../types/ui';
import { cn } from '../utils/cn';

type CheckboxElement = ElementRef<'input'>;

export interface CheckboxProps
    extends
        Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'size'>,
        BaseComponentProps {
    /** Show error state */
    error?: boolean;
    /** Associated label text */
    label?: string;
    /** Checkbox size */
    size?: Size;
}

const checkboxSizeClasses: Record<Size, string> = {
    xs: 'h-3 w-3',
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
    xl: 'h-6 w-6',
};

const labelSizeClasses: Record<Size, string> = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
};

/**
 * Checkbox component with custom styling
 *
 * @example
 * <Checkbox
 *   checked={accepted}
 *   onChange={(e) => setAccepted(e.target.checked)}
 *   label="Accept terms"
 * />
 */
export const Checkbox = forwardRef<CheckboxElement, CheckboxProps>(
    (
        {
            className,
            error = false,
            label,
            size = 'md',
            disabled,
            id,
            ...props
        },
        ref,
    ) => {
        const checkboxId =
            id
            || (label ?
                `checkbox-${label.replace(/\s+/g, '-').toLowerCase()}`
            :   undefined);

        const checkbox = (
            <input
                ref={ref}
                type='checkbox'
                id={checkboxId}
                disabled={disabled}
                aria-invalid={error}
                className={cn(
                    // Base styles
                    'rounded border-2 shrink-0',
                    'transition-all duration-200',
                    'active:scale-95',

                    // Size
                    checkboxSizeClasses[size],

                    // Colors
                    error ?
                        'border-[var(--color-error)]'
                    :   'border-stone-300 dark:border-stone-600',
                    'checked:bg-[var(--color-primary)] checked:border-[var(--color-primary)]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 focus-visible:ring-offset-2',

                    // Disabled styles
                    'disabled:cursor-not-allowed disabled:opacity-50',

                    // Appearance
                    'appearance-none cursor-pointer',

                    // Checkmark (using background image for checked state)
                    "checked:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEwIDNMNC41IDguNUwyIDYiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=')]",
                    'checked:bg-center checked:bg-no-repeat',

                    !label && className,
                )}
                {...props}
            />
        );

        if (label) {
            return (
                <div
                    className={cn('inline-flex items-center gap-2', className)}
                >
                    {checkbox}
                    <label
                        htmlFor={checkboxId}
                        className={cn(
                            'cursor-pointer select-none',
                            'text-stone-700 dark:text-stone-300',
                            labelSizeClasses[size],
                            disabled && 'cursor-not-allowed opacity-50',
                        )}
                    >
                        {label}
                    </label>
                </div>
            );
        }

        return checkbox;
    },
);

Checkbox.displayName = 'Checkbox';
