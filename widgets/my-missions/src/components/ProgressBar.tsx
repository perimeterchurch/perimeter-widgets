import * as React from 'react';
import { progressLevel, progressPercent } from '../lib/format';

const LEVEL_FILL = {
  // The legacy widget used a traffic light (amber / blue / green). The token
  // palette has no `success`, so the tiers step through the amber warning token
  // and two intensities of primary rather than inventing an off-palette green.
  low: 'bg-warning',
  medium: 'bg-primary/60',
  high: 'bg-primary',
} as const;

export interface ProgressBarProps {
  raised: number;
  goal: number;
  /** Announced to screen readers, e.g. "My funds raised". */
  label: string;
}

/**
 * A funding progress track. Exposed as a real `progressbar` so the fill isn't
 * information conveyed by colour and width alone.
 */
export function ProgressBar({ raised, goal, label }: ProgressBarProps): React.JSX.Element {
  const percent = progressPercent(raised, goal);

  return (
    <div
      className="h-2 w-full overflow-hidden rounded-sm bg-muted"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-sm transition-[width] duration-300 ease-in-out ${LEVEL_FILL[progressLevel(percent)]}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
