import { cn } from '@perimeter-widgets/shared';

interface ImagePlaceholderProps {
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Placeholder shown when a sermon or series image fails to load.
 * Renders the Perimeter Church icon mark (circle with three arches)
 * in a muted style that works on both light and dark themes.
 */
export function ImagePlaceholder({ className, style }: ImagePlaceholderProps) {
    return (
        <div
            className={cn(
                'flex items-center justify-center bg-stone-100 dark:bg-stone-800',
                className,
            )}
            style={style}
        >
            <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 100 100'
                fill='none'
                className='h-12 w-12'
            >
                {/* Outer circle */}
                <circle
                    cx='50'
                    cy='50'
                    r='44'
                    className='stroke-stone-300 dark:stroke-stone-600'
                    strokeWidth='3'
                />
                {/* Three gothic arches */}
                <path
                    d='M30 72 C30 48 38 32 50 22 C62 32 70 48 70 72'
                    className='stroke-stone-300 dark:stroke-stone-600'
                    strokeWidth='3'
                    strokeLinecap='round'
                    fill='none'
                />
                <path
                    d='M18 72 C18 52 28 36 42 26'
                    className='stroke-stone-300 dark:stroke-stone-600'
                    strokeWidth='3'
                    strokeLinecap='round'
                    fill='none'
                />
                <path
                    d='M82 72 C82 52 72 36 58 26'
                    className='stroke-stone-300 dark:stroke-stone-600'
                    strokeWidth='3'
                    strokeLinecap='round'
                    fill='none'
                />
            </svg>
        </div>
    );
}
