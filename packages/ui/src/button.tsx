import * as React from 'react';
import { cn } from './utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'link' | 'destructive' | undefined;
  size?: 'sm' | 'md' | 'lg' | 'default' | 'icon' | 'icon-xs' | undefined;
  /**
   * Render the button as a different element (e.g. an anchor). When provided,
   * the button's computed className and remaining props are merged onto the
   * supplied element instead of rendering a native `<button>`. Mirrors the
   * base-ui `render` prop pattern used by the legacy registry.
   */
  render?: React.ReactElement | undefined;
  /**
   * Marker accepted for compatibility with the legacy base-ui Button API.
   * When `false`, callers expect a non-button element via `render`.
   */
  nativeButton?: boolean | undefined;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-fg hover:bg-secondary/80',
  ghost: 'bg-transparent text-fg hover:bg-muted',
  outline: 'border border-border bg-bg text-fg hover:bg-muted',
  link: 'bg-transparent text-primary underline-offset-4 hover:underline',
  destructive: 'bg-destructive text-destructive-fg hover:bg-destructive/90',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
  default: 'h-9 px-4 text-sm',
  icon: 'size-9',
  'icon-xs': 'size-6',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, render, nativeButton = true, ...rest },
  ref,
) {
  const computedClassName = cn(
    'inline-flex items-center justify-center rounded-md font-medium transition-colors',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    'disabled:pointer-events-none disabled:opacity-50',
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

  // `nativeButton` mirrors the legacy base-ui API: callers pass `false` together
  // with a `render` element to render a non-button element (e.g. an anchor)
  // instead of a native `<button>`. A `render` element is rendered whenever one
  // is supplied, or when a native button has been explicitly opted out of.
  const renderAsElement = !nativeButton || render !== undefined;

  if (renderAsElement && render) {
    const renderProps = render.props as { className?: string };
    return React.cloneElement(render, {
      ...rest,
      className: cn(computedClassName, renderProps.className),
    } as React.HTMLAttributes<HTMLElement>);
  }

  return <button ref={ref} className={computedClassName} {...rest} />;
});
