/**
 * LoadingSpinner Component
 * Animated circular spinner for loading states
 */

import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from 'react';
import { Loader2 } from 'lucide-react';
import type { BaseComponentProps, Size } from '../../types/ui';
import { cn } from '../utils/cn';

type SpinnerElement = ElementRef<'div'>;

export interface LoadingSpinnerProps
    extends ComponentPropsWithoutRef<'div'>, BaseComponentProps {
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
                <Loader2
                    className={cn(
                        'animate-spin text-[var(--color-primary)]',
                        sizeClasses[size],
                    )}
                    aria-hidden='true'
                />
                <span className='sr-only'>{label}</span>
            </div>
        );
    },
);

LoadingSpinner.displayName = 'LoadingSpinner';
