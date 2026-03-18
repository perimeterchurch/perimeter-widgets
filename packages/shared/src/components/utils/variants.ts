/**
 * Variant Helpers
 * Utilities for managing component variants and generating className strings
 */

import type { Size, Variant } from '../../types/ui';

/**
 * Size class mappings
 */
export const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
} as const satisfies Record<Size, string>;

/**
 * Padding size mappings for components
 */
export const paddingSizes = {
    xs: 'px-2 py-1',
    sm: 'px-3 py-1.5',
    md: 'px-4 py-2',
    lg: 'px-5 py-2.5',
    xl: 'px-6 py-3',
} as const satisfies Record<Size, string>;

/**
 * Icon size mappings (in pixels)
 */
export const iconSizes = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
} as const satisfies Record<Size, number>;

/**
 * Border radius mappings
 */
export const radiusSizes = {
    xs: 'rounded',
    sm: 'rounded-md',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    xl: 'rounded-2xl',
} as const satisfies Record<Size, string>;

/**
 * Button/Badge variant color mappings
 * Semantic variants use arbitrary value syntax for runtime overrideability via CSS custom properties.
 * Secondary/ghost use static stone Tailwind utilities with dark: variants.
 */
export const variantClasses = {
    primary:
        'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]',
    secondary:
        'bg-stone-100 text-stone-700 hover:bg-stone-200 active:bg-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700',
    success:
        'bg-[var(--color-success)] text-[var(--color-success-foreground)] hover:bg-[var(--color-success-hover)] active:bg-[var(--color-success-active)]',
    warning:
        'bg-[var(--color-warning)] text-[var(--color-warning-foreground)] hover:bg-[var(--color-warning-hover)] active:bg-[var(--color-warning-active)]',
    error: 'bg-[var(--color-error)] text-[var(--color-error-foreground)] hover:bg-[var(--color-error-hover)] active:bg-[var(--color-error-active)]',
    info: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]',
    ghost: 'bg-transparent text-stone-700 hover:bg-stone-100 active:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-800 dark:active:bg-stone-700',
} as const satisfies Record<Variant, string>;

/**
 * Outline variant classes
 */
export const outlineVariantClasses = {
    primary:
        'border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground)]',
    secondary:
        'border-2 border-stone-300 text-stone-700 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800',
    success:
        'border-2 border-[var(--color-success)] text-[var(--color-success)] hover:bg-[var(--color-success)] hover:text-[var(--color-success-foreground)]',
    warning:
        'border-2 border-[var(--color-warning)] text-[var(--color-warning)] hover:bg-[var(--color-warning)] hover:text-[var(--color-warning-foreground)]',
    error: 'border-2 border-[var(--color-error)] text-[var(--color-error)] hover:bg-[var(--color-error)] hover:text-[var(--color-error-foreground)]',
    info: 'border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground)]',
    ghost: 'border-2 border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800',
} as const satisfies Record<Variant, string>;

/**
 * Get padding classes for a component
 */
export function getPaddingClasses(size: Size): string {
    return paddingSizes[size];
}

/**
 * Get border radius classes for a component
 */
export function getRadiusClasses(size: Size): string {
    return radiusSizes[size];
}

/**
 * Get variant classes for a component
 */
export function getVariantClasses(variant: Variant, outline = false): string {
    return outline ? outlineVariantClasses[variant] : variantClasses[variant];
}
