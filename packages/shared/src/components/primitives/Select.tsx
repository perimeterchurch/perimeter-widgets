/**
 * Select Component
 * Native select dropdown with custom styling
 */

import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from 'react';
import { ChevronDown } from 'lucide-react';
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
            <div className={cn('relative', fullWidth ? 'w-full' : 'w-auto')}>
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

                        // Hide native arrow
                        'appearance-none',
                        'pr-9',

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
                <ChevronDown className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400' />
            </div>
        );
    },
);

Select.displayName = 'Select';
