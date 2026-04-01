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

const LIST_CLASS =
    'flex w-full items-start gap-3 cursor-pointer rounded-md px-2 py-3 text-left transition-all duration-200 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:hover:bg-stone-800/50';

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
    const [imgFailed, setImgFailed] = useState(false);

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
            <CardButton onClick={onClick} className={LIST_CLASS}>
                <FallbackImage
                    src={imageUrl}
                    alt={imageAlt}
                    failed={imgFailed}
                    onFail={() => setImgFailed(true)}
                    className='h-16 w-16 flex-shrink-0 self-center rounded'
                />
                <div className='flex min-w-0 flex-1 flex-col gap-1'>
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

    if (viewMode === 'large') {
        return (
            <CardButton
                onClick={onClick}
                className={cn('flex w-full flex-row', CARD_BASE)}
            >
                <FallbackImage
                    src={imageUrl}
                    alt={imageAlt}
                    failed={imgFailed}
                    onFail={() => setImgFailed(true)}
                    className='aspect-[4/3] w-48 flex-shrink-0'
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
                src={imageUrl}
                alt={imageAlt}
                failed={imgFailed}
                onFail={() => setImgFailed(true)}
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
