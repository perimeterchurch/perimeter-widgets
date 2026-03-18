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
import {
    getInputBorderClasses,
    inputBaseClasses,
    sizeClasses,
} from '../utils/variants';

type TextareaElement = ElementRef<'textarea'>;

export interface TextareaProps
    extends ComponentPropsWithoutRef<'textarea'>, BaseComponentProps {
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
                    inputBaseClasses,
                    'min-h-[80px] px-3 py-2',
                    'placeholder:text-stone-400 dark:placeholder:text-stone-500',
                    'resize-y',

                    // Text size
                    sizeClasses[size],

                    // Border styles
                    getInputBorderClasses(error),

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
