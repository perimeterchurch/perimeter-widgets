import { cn } from '@perimeter-widgets/shared';

interface ImagePlaceholderProps {
    className?: string;
    style?: React.CSSProperties;
}

export function ImagePlaceholder({ className, style }: ImagePlaceholderProps) {
    return (
        <div
            className={cn(
                'flex items-center justify-center bg-gradient-to-br from-primary/80 to-primary',
                className,
            )}
            style={style}
        >
            <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 64 64'
                fill='none'
                className='h-12 w-12 opacity-30'
            >
                <rect
                    x='8'
                    y='12'
                    width='48'
                    height='36'
                    rx='4'
                    stroke='white'
                    strokeWidth='2'
                />
                <path
                    d='M8 38l12-10 8 6 16-14 12 10'
                    stroke='white'
                    strokeWidth='2'
                    strokeLinejoin='round'
                />
                <circle cx='22' cy='24' r='4' stroke='white' strokeWidth='2' />
            </svg>
        </div>
    );
}
