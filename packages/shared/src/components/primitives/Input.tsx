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
import {
    getInputBorderClasses,
    inputBaseClasses,
    inputSizeClasses,
    sizeClasses,
} from '../utils/variants';

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
                    inputBaseClasses,
                    'placeholder:text-stone-400 dark:placeholder:text-stone-500',

                    // Size
                    inputSizeClasses[size],
                    sizeClasses[size],

                    // Border styles
                    getInputBorderClasses(hasError),

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
