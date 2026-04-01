import { cn } from '@perimeter-widgets/shared';

interface ImagePlaceholderProps {
    className?: string;
    style?: React.CSSProperties;
}

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
                viewBox='0 0 48 48'
                fill='none'
                className='h-10 w-10'
            >
                <rect
                    x='6'
                    y='10'
                    width='36'
                    height='28'
                    rx='3'
                    className='stroke-stone-300 dark:stroke-stone-600'
                    strokeWidth='1.5'
                />
                <path
                    d='M6 32l10-8 6 5 12-10 8 7'
                    className='stroke-stone-300 dark:stroke-stone-600'
                    strokeWidth='1.5'
                    strokeLinejoin='round'
                />
                <circle
                    cx='17'
                    cy='20'
                    r='3'
                    className='stroke-stone-300 dark:stroke-stone-600'
                    strokeWidth='1.5'
                />
            </svg>
        </div>
    );
}
