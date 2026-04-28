import { useState, type ReactNode } from 'react';
import { cn, Skeleton } from '@perimeter-widgets/shared';
import { ImagePlaceholder } from './ImagePlaceholder';

interface MediaCardProps {
    imageUrl: string;
    imageAlt: string;
    title: string;
    subtitle?: string | null;
    meta?: ReactNode;
    badges?: ReactNode;
    description?: string | null;
    /** Four-corner layout for info below title (overrides subtitle/meta/badges) */
    topLeft?: ReactNode;
    topRight?: ReactNode;
    bottomLeft?: ReactNode;
    bottomRight?: ReactNode;
    onClick: () => void;
    viewMode: 'grid' | 'list' | 'large';
}

const CARD_BASE =
    'overflow-hidden rounded-xl p-0 text-left ring-1 ring-foreground/10 bg-card text-card-foreground cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:ring-foreground/20 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

function FallbackImage({
    src,
    alt,
    className,
}: {
    src: string;
    alt: string;
    className?: string;
}) {
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);

    if (failed) {
        return <ImagePlaceholder className={className} />;
    }

    return (
        <div className={cn('relative overflow-hidden', className)}>
            {!loaded && (
                <Skeleton className='absolute inset-0 h-full w-full rounded-none' />
            )}
            <img
                src={src}
                alt={alt}
                className={cn(
                    'block h-full w-full object-cover transition-opacity duration-300',
                    loaded ? 'opacity-100' : 'opacity-0',
                )}
                onLoad={() => setLoaded(true)}
                onError={() => setFailed(true)}
            />
        </div>
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

/** Renders either four-corner layout or fallback to subtitle/meta/badges */
function InfoSection({
    title,
    topLeft,
    topRight,
    bottomLeft,
    bottomRight,
    subtitle,
    meta,
    badges,
    description,
}: Pick<
    MediaCardProps,
    | 'title'
    | 'topLeft'
    | 'topRight'
    | 'bottomLeft'
    | 'bottomRight'
    | 'subtitle'
    | 'meta'
    | 'badges'
    | 'description'
>) {
    const hasCornersLayout = topLeft || topRight || bottomLeft || bottomRight;

    if (hasCornersLayout) {
        return (
            <div className='flex flex-1 flex-col gap-1.5'>
                {topLeft && (
                    <span className='text-xs text-muted-foreground truncate'>
                        {topLeft}
                    </span>
                )}
                <p className='font-medium text-sm leading-snug line-clamp-2'>
                    {title}
                </p>
                {topRight && (
                    <span className='text-xs text-muted-foreground'>
                        {topRight}
                    </span>
                )}
                {description && (
                    <p className='text-xs text-muted-foreground line-clamp-2'>
                        {description}
                    </p>
                )}
                {(bottomLeft || bottomRight) && (
                    <div className='mt-auto flex items-center justify-between gap-2'>
                        <span className='text-xs text-muted-foreground truncate'>
                            {bottomLeft}
                        </span>
                        <span className='text-xs text-muted-foreground truncate text-right'>
                            {bottomRight}
                        </span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            {subtitle && (
                <p className='text-xs text-muted-foreground'>{subtitle}</p>
            )}
            {description && (
                <p className='text-xs text-muted-foreground line-clamp-2'>
                    {description}
                </p>
            )}
            {meta}
            {badges}
        </>
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
    topLeft,
    topRight,
    bottomLeft,
    bottomRight,
    onClick,
    viewMode,
}: MediaCardProps) {
    const infoProps = {
        title,
        topLeft,
        topRight,
        bottomLeft,
        bottomRight,
        subtitle,
        meta,
        badges,
        description,
    };

    const hasCornersLayout = topLeft || topRight || bottomLeft || bottomRight;

    if (viewMode === 'list') {
        return (
            <CardButton
                onClick={onClick}
                className='flex w-full items-center gap-3 px-1 py-2 text-left cursor-pointer border-b border-border last:border-b-0 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
            >
                <FallbackImage
                    key={imageUrl}
                    src={imageUrl}
                    alt={imageAlt}
                    className='h-10 w-10 flex-shrink-0 rounded'
                />
                <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-medium'>{title}</p>
                    <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                        {topLeft}
                        {topRight && <>{topRight}</>}
                        {bottomLeft}
                        {bottomRight && <>{bottomRight}</>}
                        {!hasCornersLayout && subtitle && (
                            <span className='truncate'>{subtitle}</span>
                        )}
                    </div>
                </div>
            </CardButton>
        );
    }

    if (viewMode === 'large') {
        return (
            <CardButton
                onClick={onClick}
                className={cn('flex w-full flex-row', CARD_BASE)}
            >
                <FallbackImage
                    key={imageUrl}
                    src={imageUrl}
                    alt={imageAlt}
                    className='aspect-video w-56 flex-shrink-0'
                />
                <div className='flex flex-1 flex-col gap-1 p-4'>
                    {!hasCornersLayout && (
                        <p className='font-medium text-sm leading-snug line-clamp-2'>
                            {title}
                        </p>
                    )}
                    <InfoSection {...infoProps} />
                </div>
            </CardButton>
        );
    }

    // Grid view (default)
    return (
        <CardButton
            onClick={onClick}
            className={cn('flex flex-col', CARD_BASE)}
        >
            <FallbackImage
                key={imageUrl}
                src={imageUrl}
                alt={imageAlt}
                className='aspect-video w-full'
            />
            <div className='flex flex-1 flex-col gap-1 p-3'>
                {!hasCornersLayout && (
                    <p className='font-medium text-sm leading-snug line-clamp-2'>
                        {title}
                    </p>
                )}
                <InfoSection {...infoProps} />
            </div>
        </CardButton>
    );
}
