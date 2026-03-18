/**
 * Switch Component
 * Toggle switch with custom styling and accessibility features
 */

import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from 'react';
import type { BaseComponentProps, Size } from '../../types/ui';
import { cn } from '../utils/cn';

type SwitchElement = ElementRef<'input'>;

export interface SwitchProps
    extends
        Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'size'>,
        BaseComponentProps {
    /** Associated label text */
    label?: string;
    /** Switch size */
    size?: Size;
}

const switchSizeClasses: Record<
    Size,
    { track: string; knob: string; translate: string }
> = {
    xs: {
        track: 'h-4 w-7',
        knob: 'before:h-3 before:w-3',
        translate: 'checked:before:translate-x-3',
    },
    sm: {
        track: 'h-5 w-9',
        knob: 'before:h-4 before:w-4',
        translate: 'checked:before:translate-x-4',
    },
    md: {
        track: 'h-6 w-11',
        knob: 'before:h-5 before:w-5',
        translate: 'checked:before:translate-x-5',
    },
    lg: {
        track: 'h-7 w-13',
        knob: 'before:h-6 before:w-6',
        translate: 'checked:before:translate-x-6',
    },
    xl: {
        track: 'h-8 w-15',
        knob: 'before:h-7 before:w-7',
        translate: 'checked:before:translate-x-7',
    },
};

const labelSizeClasses: Record<Size, string> = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
};

/**
 * Switch component (toggle)
 *
 * @example
 * <Switch
 *   checked={enabled}
 *   onChange={(e) => setEnabled(e.target.checked)}
 *   label="Enable notifications"
 * />
 */
export const Switch = forwardRef<SwitchElement, SwitchProps>(
    ({ className, label, size = 'md', disabled, id, ...props }, ref) => {
        const switchId =
            id
            || (label ?
                `switch-${label.replace(/\s+/g, '-').toLowerCase()}`
            :   undefined);
        const sizeConfig = switchSizeClasses[size];

        const switchInput = (
            <input
                ref={ref}
                type='checkbox'
                role='switch'
                id={switchId}
                disabled={disabled}
                className={cn(
                    // Base styles
                    'relative shrink-0 appearance-none rounded-full',
                    'transition-colors duration-200 cursor-pointer',
                    'active:scale-95',

                    // Size
                    sizeConfig.track,

                    // Background colors
                    'bg-stone-300 checked:bg-[var(--color-primary)]',
                    'dark:bg-stone-600',

                    // Focus styles
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 focus-visible:ring-offset-2',

                    // Disabled styles
                    'disabled:cursor-not-allowed disabled:opacity-50',

                    // Toggle knob (pseudo-element)
                    'before:content-[""] before:absolute before:top-[2px] before:left-[2px]',
                    'before:rounded-full before:bg-white',
                    'before:transition-transform before:duration-200',
                    'before:shadow-sm',
                    sizeConfig.knob,

                    // Checked state - move knob to right
                    sizeConfig.translate,

                    !label && className,
                )}
                {...props}
            />
        );

        if (label) {
            return (
                <div
                    className={cn('inline-flex items-center gap-2', className)}
                >
                    {switchInput}
                    <label
                        htmlFor={switchId}
                        className={cn(
                            'cursor-pointer select-none',
                            'text-stone-700 dark:text-stone-300',
                            labelSizeClasses[size],
                            disabled && 'cursor-not-allowed opacity-50',
                        )}
                    >
                        {label}
                    </label>
                </div>
            );
        }

        return switchInput;
    },
);

Switch.displayName = 'Switch';
