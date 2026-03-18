/**
 * Button Component
 * Primary interactive component with multiple variants and sizes
 */

import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from 'react';
import type {
    InteractiveProps,
    VariantProps,
    WidthProps,
} from '../../types/ui';
import { cn } from '../utils/cn';
import {
    getVariantClasses,
    getPaddingClasses,
    getRadiusClasses,
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
                    getVariantClasses(variant, outline),

                    // Shadow for filled variants (not ghost/outline)
                    !outline
                        && variant !== 'ghost'
                        && 'shadow-sm hover:shadow-md',

                    // Size styles
                    getPaddingClasses(size),
                    getRadiusClasses(size),

                    // Width
                    fullWidth && 'w-full',

                    // Custom className
                    className,
                )}
                {...props}
            >
                {isLoading && (
                    <svg
                        className='animate-spin h-4 w-4'
                        xmlns='http://www.w3.org/2000/svg'
                        fill='none'
                        viewBox='0 0 24 24'
                        aria-hidden='true'
                    >
                        <circle
                            className='opacity-25'
                            cx='12'
                            cy='12'
                            r='10'
                            stroke='currentColor'
                            strokeWidth='4'
                        />
                        <path
                            className='opacity-75'
                            fill='currentColor'
                            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                        />
                    </svg>
                )}
                {children}
            </button>
        );
    },
);

Button.displayName = 'Button';
