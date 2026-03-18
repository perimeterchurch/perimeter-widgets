/**
 * Input Component
 * Text input field with error states, sizes, and accessibility features
 */

import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from 'react';
import type { BaseComponentProps, Size } from '../../types/ui';
import { cn } from '../utils/cn';
import { sizeClasses } from '../utils/variants';

type InputElement = ElementRef<'input'>;

export interface InputProps
    extends
        Omit<ComponentPropsWithoutRef<'input'>, 'size'>,
        BaseComponentProps {
    /** Input size */
    size?: Size;
    /** Error message (truthy value triggers error state) */
    error?: string;
    /** Full width */
    fullWidth?: boolean;
}

const inputSizeClasses: Record<Size, string> = {
    xs: 'h-7 px-2 py-1',
    sm: 'h-8 px-2.5 py-1.5',
    md: 'h-10 px-3 py-2',
    lg: 'h-12 px-4 py-2.5',
    xl: 'h-14 px-5 py-3',
};

/**
 * Input component for text input fields
 *
 * @example
 * <Input
 *   type="email"
 *   placeholder="Enter your email"
 *   error="Invalid email address"
 *   aria-describedby="email-error"
 * />
 */
export const Input = forwardRef<InputElement, InputProps>(
    (
        {
            className,
            size = 'md',
            error,
            fullWidth = false,
            disabled,
            onKeyDown,
            ...props
        },
        ref,
    ) => {
        const hasError = Boolean(error);

        return (
            <input
                ref={ref}
                disabled={disabled}
                aria-invalid={hasError}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') e.currentTarget.blur();
                    onKeyDown?.(e);
                }}
                className={cn(
                    // Base styles
                    'flex rounded-lg border bg-white',
                    'placeholder:text-stone-400',
                    'transition-colors duration-200',

                    // Dark mode
                    'dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500',

                    // Size
                    inputSizeClasses[size],
                    sizeClasses[size],

                    // Focus styles
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 focus-visible:ring-offset-2',

                    // Border styles
                    hasError
                        ? 'border-[var(--color-error)] focus-visible:ring-[var(--color-error)]/50'
                        : 'border-stone-300 dark:border-stone-600',

                    // Disabled styles
                    'disabled:cursor-not-allowed disabled:opacity-50',

                    // Width
                    fullWidth ? 'w-full' : 'w-auto',

                    className,
                )}
                {...props}
            />
        );
    },
);

Input.displayName = 'Input';
