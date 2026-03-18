/**
 * LoadingSpinner Component
 * Animated circular spinner for loading states
 */

import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from 'react';
import type { BaseComponentProps, Size } from '../../types/ui';
import { cn } from '../utils/cn';
import { iconSizes } from '../utils/variants';

type SpinnerElement = ElementRef<'div'>;

export interface LoadingSpinnerProps
    extends ComponentPropsWithoutRef<'div'>,
        BaseComponentProps {
    /** Spinner size */
    size?: Size;
    /** Optional label for screen readers */
    label?: string;
}

const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-10 w-10',
} as const satisfies Record<Size, string>;

/**
 * Loading spinner with customizable size
 *
 * @example
 * <LoadingSpinner size="md" label="Loading content" />
 */
export const LoadingSpinner = forwardRef<SpinnerElement, LoadingSpinnerProps>(
    (
        {
            size = 'md',
            label = 'Loading',
            className,
            'aria-label': ariaLabel,
            ...props
        },
        ref,
    ) => {
        return (
            <div
                ref={ref}
                role='status'
                aria-label={ariaLabel ?? label}
                className={cn('inline-block', className)}
                {...props}
            >
                <svg
                    className={cn(
                        'animate-spin text-[var(--color-primary)] dark:text-[var(--color-primary)]',
                        sizeClasses[size],
                    )}
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                    aria-hidden='true'
                    width={iconSizes[size]}
                    height={iconSizes[size]}
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
                <span className='sr-only'>{label}</span>
            </div>
        );
    },
);

LoadingSpinner.displayName = 'LoadingSpinner';
