import { cn } from '@perimeter-widgets/shared';

interface ImagePlaceholderProps {
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Placeholder shown when a sermon or series image fails to load.
 * Renders the Perimeter Church icon mark (circle with three interwoven
 * gothic arches) in muted colors for both light and dark themes.
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
                viewBox='0 0 200 200'
                fill='none'
                className='h-14 w-14'
            >
                {/* Outer circle */}
                <circle
                    cx='100'
                    cy='100'
                    r='90'
                    className='stroke-stone-300 dark:stroke-stone-600'
                    strokeWidth='8'
                />
                {/* Left arch */}
                <path
                    d='M42 170 C42 110 58 75 80 50 C90 62 96 78 98 98'
                    className='stroke-stone-300 dark:stroke-stone-600'
                    strokeWidth='8'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
                <path
                    d='M98 98 C100 120 98 145 92 170'
                    className='stroke-stone-300 dark:stroke-stone-600'
                    strokeWidth='8'
                    strokeLinecap='round'
                />
                {/* Right arch */}
                <path
                    d='M158 170 C158 110 142 75 120 50 C110 62 104 78 102 98'
                    className='stroke-stone-300 dark:stroke-stone-600'
                    strokeWidth='8'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
                <path
                    d='M102 98 C100 120 102 145 108 170'
                    className='stroke-stone-300 dark:stroke-stone-600'
                    strokeWidth='8'
                    strokeLinecap='round'
                />
                {/* Center arch (on top) */}
                <path
                    d='M68 170 C68 120 78 85 100 42 C122 85 132 120 132 170'
                    className='stroke-stone-300 dark:stroke-stone-600'
                    strokeWidth='8'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
            </svg>
        </div>
    );
}
