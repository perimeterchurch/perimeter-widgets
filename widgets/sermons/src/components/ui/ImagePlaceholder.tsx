import { cn } from '@perimeter/ui/utils/cn';

interface ImagePlaceholderProps {
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
}

const LOGO_URL = 'https://www.perimeter.org/wp-content/uploads/2023/11/mobile-logo.png';

export function ImagePlaceholder({ className, style }: ImagePlaceholderProps) {
  return (
    <div className={cn('flex items-center justify-center bg-muted', className)} style={style}>
      <img src={LOGO_URL} alt="Perimeter Church" className="h-full w-full object-contain p-4" />
    </div>
  );
}
