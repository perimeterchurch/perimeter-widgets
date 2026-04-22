import { cn } from '@perimeter-widgets/shared';

interface ImagePlaceholderProps {
    className?: string;
    style?: React.CSSProperties;
}

const LOGO_URL =
    'https://www.perimeter.org/wp-content/uploads/2023/11/mobile-logo.png';

export function ImagePlaceholder({ className, style }: ImagePlaceholderProps) {
    return (
        <div
            className={cn(
                'flex items-center justify-center bg-stone-100 dark:bg-stone-800',
                className,
            )}
            style={style}
        >
            <img
                src={LOGO_URL}
                alt='Perimeter Church'
                className='h-full w-full object-contain p-4'
            />
        </div>
    );
}
