import * as React from 'react';

/**
 * Hand-rolled inline icons. This widget deliberately carries no icon library —
 * the same choice the event-finder, community-group-finder, staff-directory and
 * prayer-wall widgets made. Only the sermons widget pulls in lucide-react.
 */

interface IconProps {
  className?: string;
}

const STROKE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

export function GlobeIcon({ className }: IconProps): React.JSX.Element {
  return (
    <svg {...STROKE} strokeWidth={1.5} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </svg>
  );
}

export function PinIcon({ className }: IconProps): React.JSX.Element {
  return (
    <svg {...STROKE} className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps): React.JSX.Element {
  return (
    <svg {...STROKE} className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function MoneyIcon({ className }: IconProps): React.JSX.Element {
  return (
    <svg {...STROKE} className={className}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

export function PersonIcon({ className }: IconProps): React.JSX.Element {
  return (
    <svg {...STROKE} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function ArrowLeftIcon({ className }: IconProps): React.JSX.Element {
  return (
    <svg {...STROKE} className={className}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export function LinkIcon({ className }: IconProps): React.JSX.Element {
  return (
    <svg {...STROKE} className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps): React.JSX.Element {
  return (
    <svg {...STROKE} className={className}>
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}
