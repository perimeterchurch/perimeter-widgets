/**
 * Textarea Component
 * Multi-line text input with error states and accessibility features
 */

import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from 'react';
import type { BaseComponentProps, Size } from '../../types/ui';
import { cn } from '../utils/cn';
import { sizeClasses } from '../utils/variants';

type TextareaElement = ElementRef<'textarea'>;

export interface TextareaProps
    extends ComponentPropsWithoutRef<'textarea'>,
        BaseComponentProps {
    /** Input size */
    size?: Size;
    /** Show error state */
    error?: boolean;
    /** Full width */
    fullWidth?: boolean;
}

/**
 * Textarea component for multi-line text input
 *
 * @example
 * <Textarea
 *   placeholder="Enter your message"
 *   rows={4}
 *   error={!!errors.message}
 *   aria-describedby="message-error"
 * />
 */
export const Textarea = forwardRef<TextareaElement, TextareaProps>(
    (
        {
            className,
            size = 'md',
            error = false,
            fullWidth = false,
            disabled,
            onKeyDown,
            ...props
        },
        ref,
    ) => {
        return (
            <textarea
                ref={ref}
                disabled={disabled}
                aria-invalid={error}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') e.currentTarget.blur();
                    onKeyDown?.(e);
                }}
                className={cn(
                    // Base styles
                    'flex min-h-[80px] rounded-lg border bg-white px-3 py-2',
                    'placeholder:text-stone-400',
                    'transition-colors duration-200',
                    'resize-y',

                    // Dark mode
                    'dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500',

                    // Text size
                    sizeClasses[size],

                    // Focus styles
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 focus-visible:ring-offset-2',

                    // Border styles
                    error
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

Textarea.displayName = 'Textarea';
