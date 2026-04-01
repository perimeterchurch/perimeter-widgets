import { useState, type ReactNode } from 'react';
import { cn } from '@perimeter-widgets/shared';
import { ImagePlaceholder } from './ImagePlaceholder';

interface MediaCardProps {
    imageUrl: string;
    imageAlt: string;
    title: string;
    subtitle?: string | null;
    meta?: ReactNode;
    badges?: ReactNode;
    description?: string | null;
    onClick: () => void;
    viewMode: 'grid' | 'list' | 'large';
}

const CARD_CLASS =
    'flex flex-col overflow-hidden rounded-xl p-0 text-left ring-1 ring-foreground/10 bg-card text-card-foreground cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:ring-foreground/20 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

const LIST_CLASS =
    'flex w-full items-center gap-3 cursor-pointer rounded-md px-2 py-3 transition-all duration-200 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:hover:bg-stone-800/50';

function FallbackImage({
    src,
    alt,
    className,
    failed,
    onFail,
}: {
    src: string;
    alt: string;
    className?: string;
    failed: boolean;
    onFail: () => void;
}) {
    if (failed) {
        return <ImagePlaceholder className={className} />;
    }
    return (
        <img
            src={src}
            alt={alt}
            className={cn('block object-cover', className)}
            onError={onFail}
        />
    );
}

function CardButton({
    onClick,
    className,
    children,
}: {
    onClick: () => void;
    className: string;
    children: ReactNode;
}) {
    return (
        <button type='button' onClick={onClick} className={className}>
            {children}
        </button>
    );
}

export function MediaCard({
    imageUrl,
    imageAlt,
    title,
    subtitle,
    meta,
    badges,
    description,
    onClick,
    viewMode,
}: MediaCardProps) {
    const [imgFailed, setImgFailed] = useState(false);

    if (viewMode === 'list') {
        return (
            <CardButton onClick={onClick} className={LIST_CLASS}>
                <FallbackImage
                    src={imageUrl}
                    alt={imageAlt}
                    failed={imgFailed}
                    onFail={() => setImgFailed(true)}
                    className='h-12 w-12 flex-shrink-0 rounded'
                />
                <div className='min-w-0 flex-1 space-y-0.5'>
                    <p className='truncate text-sm font-medium text-card-foreground'>
                        {title}
                    </p>
                    {subtitle && (
                        <p className='text-xs text-muted-foreground'>
                            {subtitle}
                        </p>
                    )}
                    {meta}
                </div>
                {badges}
            </CardButton>
        );
    }

    if (viewMode === 'large') {
        return (
            <CardButton
                onClick={onClick}
                className={cn('w-full flex-row', CARD_CLASS)}
            >
                <FallbackImage
                    src={imageUrl}
                    alt={imageAlt}
                    failed={imgFailed}
                    onFail={() => setImgFailed(true)}
                    className='aspect-[4/3] w-48 flex-shrink-0'
                />
                <div className='flex flex-1 flex-col justify-between p-4 space-y-2'>
                    <div className='space-y-1'>
                        <p className='font-medium text-sm leading-snug line-clamp-2'>
                            {title}
                        </p>
                        {subtitle && (
                            <p className='text-xs text-muted-foreground'>
                                {subtitle}
                            </p>
                        )}
                        {description && (
                            <p className='text-xs text-muted-foreground line-clamp-2'>
                                {description}
                            </p>
                        )}
                    </div>
                    <div className='flex items-center gap-2'>
                        {badges}
                        {meta}
                    </div>
                </div>
            </CardButton>
        );
    }

    // Grid view (default)
    return (
        <CardButton onClick={onClick} className={CARD_CLASS}>
            <FallbackImage
                src={imageUrl}
                alt={imageAlt}
                failed={imgFailed}
                onFail={() => setImgFailed(true)}
                className='aspect-video w-full'
            />
            <div className='p-3 space-y-1'>
                <p className='font-medium text-sm leading-snug line-clamp-2'>
                    {title}
                </p>
                {subtitle && (
                    <p className='text-xs text-muted-foreground'>{subtitle}</p>
                )}
                {meta}
                {badges}
            </div>
        </CardButton>
    );
}
