/**
 * Button Component
 * Primary interactive component with multiple variants and sizes
 */

import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from 'react';
import { Loader2 } from 'lucide-react';
import type {
    InteractiveProps,
    VariantProps,
    WidthProps,
} from '../../types/ui';
import { cn } from '../utils/cn';
import {
    outlineVariantClasses,
    paddingSizes,
    radiusSizes,
    variantClasses,
} from '../utils/variants';

type ButtonElement = ElementRef<'button'>;

export interface ButtonProps
    extends
        Omit<ComponentPropsWithoutRef<'button'>, 'disabled'>,
        InteractiveProps,
        VariantProps,
        WidthProps {
    /** Button type */
    type?: 'button' | 'submit' | 'reset';
    /** Outline variant instead of filled */
    outline?: boolean;
}

/**
 * Button component with variants, sizes, and loading states
 *
 * @example
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click me
 * </Button>
 *
 * @example
 * <Button variant="error" outline isLoading disabled>
 *   Loading...
 * </Button>
 */
export const Button = forwardRef<ButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            type = 'button',
            fullWidth = false,
            outline = false,
            disabled = false,
            isLoading = false,
            className,
            children,
            'aria-label': ariaLabel,
            ...props
        },
        ref,
    ) => {
        const isDisabled = disabled || isLoading;

        return (
            <button
                ref={ref}
                type={type}
                disabled={isDisabled}
                aria-label={ariaLabel}
                aria-busy={isLoading}
                className={cn(
                    // Base styles
                    'inline-flex items-center justify-center gap-2',
                    'font-medium transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 focus-visible:ring-offset-2',
                    'min-h-11',
                    'active:scale-[0.98]',
                    'disabled:pointer-events-none disabled:opacity-50',

                    // Variant styles
                    outline ?
                        outlineVariantClasses[variant]
                    :   variantClasses[variant],

                    // Shadow for filled variants (not ghost/outline)
                    !outline
                        && variant !== 'ghost'
                        && 'shadow-sm hover:shadow-md',

                    // Size styles
                    paddingSizes[size],
                    radiusSizes[size],

                    // Width
                    fullWidth && 'w-full',

                    // Custom className
                    className,
                )}
                {...props}
            >
                {isLoading && (
                    <Loader2
                        className='animate-spin h-4 w-4'
                        aria-hidden='true'
                    />
                )}
                {children}
            </button>
        );
    },
);

Button.displayName = 'Button';
