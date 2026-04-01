import type { ReactNode } from 'react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    cn,
} from '@perimeter-widgets/shared';
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

const HOVER_CLASS =
    'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:ring-foreground/20 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

const LIST_HOVER_CLASS =
    'cursor-pointer rounded-md px-2 py-3 transition-all duration-200 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:hover:bg-stone-800/50';

function FallbackImage({
    src,
    alt,
    className,
}: {
    src: string;
    alt: string;
    className?: string;
}) {
    return (
        <>
            <img
                src={src}
                alt={alt}
                className={cn('object-cover', className)}
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (
                        e.target as HTMLImageElement
                    ).nextElementSibling?.classList.remove('hidden');
                }}
            />
            <ImagePlaceholder className={cn('hidden', className)} />
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
    onClick,
    viewMode,
}: MediaCardProps) {
    if (viewMode === 'list') {
        return (
            <button
                type='button'
                onClick={onClick}
                className={cn(
                    'flex w-full items-center gap-3',
                    LIST_HOVER_CLASS,
                )}
            >
                <FallbackImage
                    src={imageUrl}
                    alt={imageAlt}
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
            </button>
        );
    }

    if (viewMode === 'large') {
        return (
            <Card
                size='sm'
                className={cn('flex-row', HOVER_CLASS)}
                onClick={onClick}
                role='button'
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClick();
                    }
                }}
            >
                <FallbackImage
                    src={imageUrl}
                    alt={imageAlt}
                    className='min-h-32 w-44 flex-shrink-0'
                />
                <div className='flex flex-1 flex-col justify-between p-4 space-y-2'>
                    <CardHeader className='p-0'>
                        <CardTitle className='line-clamp-2'>{title}</CardTitle>
                        {subtitle && (
                            <CardDescription>{subtitle}</CardDescription>
                        )}
                    </CardHeader>
                    {description && (
                        <p className='text-sm text-muted-foreground line-clamp-2'>
                            {description}
                        </p>
                    )}
                    <div className='flex items-center gap-2'>
                        {badges}
                        {meta}
                    </div>
                </div>
            </Card>
        );
    }

    // Grid view (default)
    return (
        <Card
            size='sm'
            className={cn('p-0', HOVER_CLASS)}
            onClick={onClick}
            role='button'
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            <FallbackImage
                src={imageUrl}
                alt={imageAlt}
                className='aspect-video w-full'
            />
            <CardHeader className='pb-3'>
                <CardTitle className='line-clamp-2'>{title}</CardTitle>
                {subtitle && <CardDescription>{subtitle}</CardDescription>}
                {meta}
                {badges}
            </CardHeader>
        </Card>
    );
}
