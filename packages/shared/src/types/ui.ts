/**
 * Shared UI Types
 * Type definitions for UI components
 */

import { type ReactNode } from 'react';

/**
 * Component size variants
 */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Component visual variants
 */
export type Variant =
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'ghost';

/**
 * Base props for all components
 */
export interface BaseComponentProps {
    /** Additional CSS classes */
    className?: string;
    /** Child elements */
    children?: ReactNode;
    /** HTML id attribute */
    id?: string;
    /** Test identifier */
    'data-testid'?: string;
}

/**
 * Props for interactive components (buttons, inputs, etc.)
 */
export interface InteractiveProps extends BaseComponentProps {
    /** Disable interaction */
    disabled?: boolean;
    /** Show loading state */
    isLoading?: boolean;
    /** Accessible label */
    'aria-label'?: string;
}

/**
 * Props for components with variants
 */
export interface VariantProps {
    /** Visual variant */
    variant?: Variant;
    /** Size variant */
    size?: Size;
}

/**
 * Props for components that support full width
 */
export interface WidthProps {
    /** Expand to full width */
    fullWidth?: boolean;
}

/**
 * Utility type: Make specific props required
 */
export type RequiredProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Utility type: Extract variant value from a type
 */
export type VariantValue<T> = T extends { variant: infer V } ? V : never;

/**
 * Utility type: Extract size value from a type
 */
export type SizeValue<T> = T extends { size: infer S } ? S : never;
