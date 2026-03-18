/**
 * Shared UI Types
 * Type definitions for UI components
 */

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
