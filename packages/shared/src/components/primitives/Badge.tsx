/**
 * Badge Component
 * Status indicators, labels, and tags with variant colors
 */

import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from 'react';
import type { Variant } from '../../types/ui';
import { cn } from '../utils/cn';

type BadgeElement = ElementRef<'span'>;

type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
    /** Visual variant */
    variant?: Variant;
    /** Badge size */
    size?: BadgeSize;
    /** Show a colored dot before the label */
    dot?: boolean;
    /** Outline style instead of filled */
    outline?: boolean;
}

const variantStyles: Record<Variant, string> = {
    primary:
        'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
    secondary:
        'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
    success:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    warning:
        'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    error: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
    info: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
    ghost: 'bg-transparent text-stone-600 dark:text-stone-400',
};

const outlineStyles: Record<Variant, string> = {
    primary:
        'border border-[var(--color-primary)] text-[var(--color-primary)] bg-transparent',
    secondary:
        'border border-stone-300 text-stone-700 bg-transparent dark:border-stone-600 dark:text-stone-300',
    success:
        'border border-emerald-300 text-emerald-700 bg-transparent dark:border-emerald-600 dark:text-emerald-400',
    warning:
        'border border-amber-300 text-amber-700 bg-transparent dark:border-amber-600 dark:text-amber-400',
    error: 'border border-rose-300 text-rose-700 bg-transparent dark:border-rose-600 dark:text-rose-400',
    info: 'border border-sky-300 text-sky-700 bg-transparent dark:border-sky-600 dark:text-sky-400',
    ghost: 'border border-stone-200 text-stone-600 bg-transparent dark:border-stone-700 dark:text-stone-400',
};

const dotColors: Record<Variant, string> = {
    primary: 'bg-[var(--color-primary)]',
    secondary: 'bg-stone-400 dark:bg-stone-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
    info: 'bg-sky-500',
    ghost: 'bg-stone-400 dark:bg-stone-500',
};

const sizeStyles: Record<BadgeSize, string> = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
};

/**
 * Badge component for status indicators, labels, and tags
 *
 * @example
 * <Badge variant="success" dot>Active</Badge>
 * <Badge variant="warning">Pending</Badge>
 * <Badge variant="error" outline>Error</Badge>
 */
export const Badge = forwardRef<BadgeElement, BadgeProps>(
    (
        {
            variant = 'secondary',
            size = 'md',
            dot = false,
            outline = false,
            className,
            children,
            ...props
        },
        ref,
    ) => {
        return (
            <span
                ref={ref}
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-full font-medium',
                    outline ? outlineStyles[variant] : variantStyles[variant],
                    sizeStyles[size],
                    className,
                )}
                {...props}
            >
                {dot && (
                    <span
                        className={cn(
                            'h-1.5 w-1.5 rounded-full shrink-0',
                            dotColors[variant],
                        )}
                        aria-hidden='true'
                    />
                )}
                {children}
            </span>
        );
    },
);

Badge.displayName = 'Badge';
