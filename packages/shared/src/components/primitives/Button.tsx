import { type ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

const variantClasses = {
    primary:
        'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active',
    secondary:
        'bg-stone-100 text-stone-900 hover:bg-stone-200 active:bg-stone-300 border border-stone-200',
    ghost: 'text-stone-700 hover:bg-stone-100 active:bg-stone-200',
} as const;

const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
} as const;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    function Button(
        {
            variant = 'primary',
            size = 'md',
            isLoading = false,
            disabled,
            className = '',
            children,
            ...props
        },
        ref,
    ) {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={[
                    'inline-flex items-center justify-center',
                    'rounded-md font-medium',
                    'transition-colors duration-150',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    variantClasses[variant],
                    sizeClasses[size],
                    className,
                ]
                    .filter(Boolean)
                    .join(' ')}
                {...props}
            >
                {isLoading ?
                    <span className='mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                :   null}
                {children}
            </button>
        );
    },
);
