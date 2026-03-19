/**
 * Lightweight Modal wrapper for widget-sermons.
 * Uses Headless UI Dialog for accessibility — no framer-motion animations.
 */

import { Dialog, DialogPanel } from '@headlessui/react';
import type { ReactNode } from 'react';
import { cn } from '@perimeter-widgets/shared';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showCloseButton?: boolean;
    className?: string;
    children?: ReactNode;
}

const sizeClasses = {
    sm: 'max-w-[400px]',
    md: 'max-w-[480px]',
    lg: 'max-w-[640px]',
    xl: 'max-w-[800px]',
} as const;

export function Modal({
    open,
    onClose,
    size = 'md',
    className,
    children,
}: ModalProps) {
    return (
        <Dialog open={open} onClose={onClose} className='relative z-[1000]'>
            {/* Backdrop */}
            <div className='fixed inset-0 bg-black/40 backdrop-blur-sm' />

            {/* Positioning container */}
            <div
                className='fixed inset-0 flex items-center justify-center overflow-y-auto p-4'
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <DialogPanel
                    className={cn(
                        'relative w-full rounded-xl border border-stone-200 bg-white px-6 py-6 shadow-xl dark:border-stone-800 dark:bg-stone-900',
                        sizeClasses[size],
                        className,
                    )}
                >
                    {children}
                </DialogPanel>
            </div>
        </Dialog>
    );
}

interface ModalFooterProps {
    children: ReactNode;
    className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
    return (
        <div
            className={cn(
                'mt-6 flex items-center justify-end gap-3 border-t border-stone-200 pt-6 dark:border-stone-800',
                className,
            )}
        >
            {children}
        </div>
    );
}
