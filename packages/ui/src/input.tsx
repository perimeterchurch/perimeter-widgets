import * as React from 'react';
import { cn } from './utils/cn';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, type = 'text', ...rest }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-border bg-bg px-3 py-1 text-sm text-fg',
        'placeholder:text-muted-fg',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...rest}
    />
  );
});
