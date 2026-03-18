/**
 * FilterChip Component
 * Pill-shaped chip with optional remove button for filter displays
 */

import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from 'react';
import { X } from 'lucide-react';
import type { BaseComponentProps, Variant, Size } from '../../types/ui';
import { cn } from '../utils/cn';

type FilterChipElement = ElementRef<'span'>;

export interface FilterChipProps
    extends
        Omit<ComponentPropsWithoutRef<'span'>, 'children'>,
        BaseComponentProps {
    /** Chip label text */
    label: string;
    /** Callback when remove button is clicked */
    onRemove?: () => void;
    /** Visual variant */
    variant?: Variant;
    /** Chip size */
    size?: Size;
}

const chipVariantStyles: Record<Variant, string> = {
    primary:
        'bg-[var(--color-primary)]/10 text-[var(--color-primary)] dark:text-[var(--color-primary)]',
    secondary:
        'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
    success:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    warning:
        'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    error: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
    info: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
    ghost: 'bg-transparent text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700',
};

const chipSizeStyles: Record<Size, string> = {
    xs: 'text-xs px-1.5 py-0.5 gap-1',
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-1.5',
    xl: 'text-base px-3.5 py-2 gap-2',
};

const removeSizeStyles: Record<Size, string> = {
    xs: 'h-3 w-3',
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
    xl: 'h-4.5 w-4.5',
};

/**
 * FilterChip component for displaying active filters
 *
 * @example
 * <FilterChip label="Status: Active" onRemove={() => removeFilter('status')} />
 * <FilterChip label="Tag" variant="success" />
 */
export const FilterChip = forwardRef<FilterChipElement, FilterChipProps>(
    (
        {
            label,
            onRemove,
            variant = 'primary',
            size = 'md',
            className,
            ...props
        },
        ref,
    ) => {
        return (
            <span
                ref={ref}
                className={cn(
                    'inline-flex items-center rounded-full font-medium',
                    'transition-all duration-200',
                    'hover:shadow-sm',
                    chipVariantStyles[variant],
                    chipSizeStyles[size],
                    className,
                )}
                {...props}
            >
                {label}
                {onRemove && (
                    <button
                        type='button'
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                        className={cn(
                            'inline-flex items-center justify-center shrink-0',
                            'rounded-full opacity-60 hover:opacity-100 hover:scale-110',
                            'transition-all duration-150',
                            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current',
                        )}
                        aria-label={`Remove ${label}`}
                    >
                        <X
                            className={removeSizeStyles[size]}
                            aria-hidden='true'
                        />
                    </button>
                )}
            </span>
        );
    },
);

FilterChip.displayName = 'FilterChip';
