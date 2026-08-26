import * as React from 'react';

export const ICON = 'h-4 w-4';

export function TripFact({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <p className="flex items-center gap-2 font-sans text-sm text-muted-fg">
      <span className="shrink-0">{icon}</span>
      <span>{children}</span>
    </p>
  );
}
