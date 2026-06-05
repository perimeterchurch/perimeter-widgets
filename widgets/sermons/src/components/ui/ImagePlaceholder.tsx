import { cn } from '@perimeter/ui/utils/cn';

interface ImagePlaceholderProps {
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
}

/**
 * Fallback image for media without artwork. Renders an inline, token-driven
 * SVG mark (a simple cross/steeple glyph) that inherits the theme via
 * `currentColor`, so it adapts to light/dark instead of pulling a fixed-color
 * remote logo.
 */
export function ImagePlaceholder({ className, style }: ImagePlaceholderProps) {
  return (
    <div
      className={cn('flex items-center justify-center bg-muted text-muted-fg', className)}
      style={style}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-2/5 w-2/5 max-h-16 max-w-16 opacity-40"
        role="img"
        aria-label="Perimeter Church"
      >
        <path d="M12 3v18" />
        <path d="M7 8h10" />
        <path d="M6 21h12" />
        <path d="M9 21v-7a3 3 0 0 1 6 0v7" />
      </svg>
    </div>
  );
}
