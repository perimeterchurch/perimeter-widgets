import * as React from 'react';
import { cn } from './utils/cn';

export function Skeleton({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...rest} />;
}
