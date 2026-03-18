/**
 * IndeterminateProgress Component
 * A thin animated progress bar for loading states using framer-motion.
 * Parent element must have `position: relative` for correct positioning.
 */

import { forwardRef, type ElementRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

type IndeterminateProgressElement = ElementRef<'div'>;

export interface IndeterminateProgressProps {
    /** Whether the progress bar is visible */
    visible: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * A thin animated progress bar that slides left-to-right indefinitely.
 *
 * @example
 * <div className="relative">
 *   <IndeterminateProgress visible={isLoading} />
 *   <Table>...</Table>
 * </div>
 */
export const IndeterminateProgress = forwardRef<
    IndeterminateProgressElement,
    IndeterminateProgressProps
>(({ visible, className }, ref) => {
    if (!visible) return null;

    return (
        <div
            ref={ref}
            role='progressbar'
            aria-label='Loading'
            className={cn(
                'absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden',
                className,
            )}
        >
            <motion.div
                className='h-full w-1/3 bg-[var(--color-primary)]'
                animate={{ x: ['-100%', '400%'] }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
        </div>
    );
});

IndeterminateProgress.displayName = 'IndeterminateProgress';
