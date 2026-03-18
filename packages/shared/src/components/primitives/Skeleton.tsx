/**
 * Skeleton Component
 * Flexible loading placeholder with shimmer effect
 */

import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from 'react';
import { cn } from '../utils/cn';

type SkeletonElement = ElementRef<'div'>;

export interface SkeletonProps extends ComponentPropsWithoutRef<'div'> {
    /** Shape variant */
    variant?: 'line' | 'circle' | 'card';
    /** Width (string or number in px) */
    width?: string | number;
    /** Height (string or number in px) */
    height?: string | number;
    /** Custom border radius */
    rounded?: string;
}

const variantStyles = {
    line: 'rounded-md',
    circle: 'rounded-full',
    card: 'rounded-xl',
} as const;

/**
 * Skeleton loading placeholder with stone shimmer
 *
 * @example
 * <Skeleton className="h-4 w-full" />
 * <Skeleton variant="circle" width={40} height={40} />
 * <Skeleton variant="card" className="h-32 w-full" />
 */
export const Skeleton = forwardRef<SkeletonElement, SkeletonProps>(
    (
        {
            variant = 'line',
            width,
            height,
            rounded,
            className,
            style,
            ...props
        },
        ref,
    ) => {
        return (
            <div
                ref={ref}
                aria-live='polite'
                aria-busy='true'
                className={cn(
                    'animate-pulse bg-stone-200 dark:bg-stone-700',
                    rounded ?? variantStyles[variant],
                    className,
                )}
                style={{
                    width: typeof width === 'number' ? `${width}px` : width,
                    height: typeof height === 'number' ? `${height}px` : height,
                    ...style,
                }}
                {...props}
            />
        );
    },
);

Skeleton.displayName = 'Skeleton';
