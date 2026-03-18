/**
 * Label Component
 * Form label with proper association and required indicator
 */

import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from 'react';
import type { BaseComponentProps } from '../../types/ui';
import { cn } from '../utils/cn';

type LabelElement = ElementRef<'label'>;

export interface LabelProps
    extends ComponentPropsWithoutRef<'label'>,
        BaseComponentProps {
    /** Show required indicator */
    required?: boolean;
    /** Disabled state (visual only) */
    disabled?: boolean;
}

/**
 * Label component for form fields
 *
 * @example
 * <Label htmlFor="email" required>
 *   Email Address
 * </Label>
 * <Input id="email" type="email" />
 */
export const Label = forwardRef<LabelElement, LabelProps>(
    (
        { className, children, required = false, disabled = false, ...props },
        ref,
    ) => {
        return (
            <label
                ref={ref}
                className={cn(
                    'text-sm font-medium leading-none text-stone-900',
                    'cursor-pointer',
                    // Dark mode
                    'dark:text-stone-100',
                    // Peer disabled
                    'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                    // Disabled prop
                    disabled && 'opacity-70 cursor-not-allowed',
                    className,
                )}
                {...props}
            >
                {children}
                {required && (
                    <>
                        <span
                            className='text-[var(--color-error)] ml-1'
                            aria-hidden='true'
                        >
                            *
                        </span>
                        <span className='sr-only'>(required)</span>
                    </>
                )}
            </label>
        );
    },
);

Label.displayName = 'Label';
