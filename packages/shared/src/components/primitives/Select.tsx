/**
 * Select Component
 * Native select dropdown with custom styling
 */

import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from 'react';
import type { BaseComponentProps, Size } from '../../types/ui';
import { cn } from '../utils/cn';
import {
    getInputBorderClasses,
    inputBaseClasses,
    inputSizeClasses,
    sizeClasses,
} from '../utils/variants';

type SelectElement = ElementRef<'select'>;

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectProps
    extends
        Omit<ComponentPropsWithoutRef<'select'>, 'size'>,
        BaseComponentProps {
    /** Predefined options (alternative to children) */
    options?: SelectOption[];
    /** Input size */
    size?: Size;
    /** Show error state */
    error?: boolean;
    /** Full width */
    fullWidth?: boolean;
}

/**
 * Select component with custom styling
 *
 * @example
 * <Select
 *   options={[{ value: '1', label: 'Option 1' }]}
 *   value={selected}
 *   onChange={(e) => setSelected(e.target.value)}
 * />
 */
export const Select = forwardRef<SelectElement, SelectProps>(
    (
        {
            className,
            options,
            size = 'md',
            error = false,
            fullWidth = false,
            disabled,
            children,
            onKeyDown,
            ...props
        },
        ref,
    ) => {
        return (
            <select
                ref={ref}
                disabled={disabled}
                aria-invalid={error}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') e.currentTarget.blur();
                    onKeyDown?.(e);
                }}
                className={cn(
                    inputBaseClasses,
                    'cursor-pointer',

                    // Size
                    inputSizeClasses[size],
                    sizeClasses[size],

                    // Border styles
                    getInputBorderClasses(error),

                    // Width
                    fullWidth ? 'w-full' : 'w-auto',

                    // Custom arrow
                    'appearance-none',
                    "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzcxNzE3YSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==')]",
                    'bg-[right_0.5rem_center] bg-no-repeat',
                    'pr-8',

                    className,
                )}
                {...props}
            >
                {options ?
                    options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))
                :   children}
            </select>
        );
    },
);

Select.displayName = 'Select';
