/**
 * Avatar Component
 * User profile image with fallback initials
 */

import {
    forwardRef,
    useState,
    type ComponentPropsWithoutRef,
    type ElementRef,
    type ReactNode,
} from 'react';
import type { BaseComponentProps, Size } from '../../types/ui';
import { cn } from '../utils/cn';

type AvatarElement = ElementRef<'div'>;

export interface AvatarProps
    extends
        Omit<ComponentPropsWithoutRef<'div'>, 'children'>,
        BaseComponentProps {
    /** Image source URL */
    src?: string;
    /** Alt text for image */
    alt?: string;
    /** Fallback initials, text, or icon element */
    fallback?: ReactNode;
    /** Avatar size */
    size?: Size;
}

const avatarSizeClasses: Record<Size, string> = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl',
};

/**
 * Avatar component with image and fallback
 *
 * @example
 * <Avatar src="/avatar.jpg" alt="John Doe" fallback="JD" size="md" />
 * <Avatar fallback="AB" size="lg" />
 */
export const Avatar = forwardRef<AvatarElement, AvatarProps>(
    (
        { src, alt = '', fallback = '?', size = 'md', className, ...props },
        ref,
    ) => {
        const [imageError, setImageError] = useState(false);
        const showImage = src && !imageError;

        return (
            <div
                ref={ref}
                className={cn(
                    // Base styles
                    'relative inline-flex items-center justify-center',
                    'rounded-full overflow-hidden',
                    'bg-stone-200 text-stone-600',
                    'dark:bg-stone-700 dark:text-stone-300',
                    'font-medium select-none shrink-0',
                    'transition-all duration-200',

                    // Size
                    avatarSizeClasses[size],

                    className,
                )}
                {...props}
            >
                {showImage ?
                    <img
                        src={src}
                        alt={alt}
                        onError={() => setImageError(true)}
                        className='h-full w-full object-cover'
                    />
                : typeof fallback === 'string' ?
                    <span className='uppercase'>{fallback}</span>
                :   fallback}
            </div>
        );
    },
);

Avatar.displayName = 'Avatar';
