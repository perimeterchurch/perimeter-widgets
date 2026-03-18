import { AnimatePresence, motion, type HTMLMotionProps } from 'framer-motion';
import { useCallback, useEffect } from 'react';
import { slideRightVariants, transitions } from '../../lib/motion/config';

export interface AnimatedPanelProps extends Omit<
    HTMLMotionProps<'div'>,
    'children'
> {
    /** Whether the panel is open */
    open: boolean;
    /** Callback when the panel should close */
    onClose: () => void;
    /** Panel width in pixels */
    width?: number;
    /** Show a backdrop overlay behind the panel */
    backdrop?: boolean;
    /** Additional class names for the panel */
    className?: string;
    /** Override class names for the backdrop overlay */
    backdropClassName?: string;
    children: React.ReactNode;
}

export function AnimatedPanel({
    open,
    onClose,
    width = 380,
    backdrop = false,
    className,
    backdropClassName,
    children,
    style,
    ...props
}: AnimatedPanelProps) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        },
        [onClose],
    );

    useEffect(() => {
        if (!open) return;
        // Use window instead of document — keyboard events from shadow DOM
        // bubble to window but may not reach document in all contexts
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, handleKeyDown]);

    return (
        <AnimatePresence>
            {open && (
                <>
                    {backdrop && (
                        <motion.div
                            key='panel-backdrop'
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={transitions.fast}
                            className={
                                backdropClassName
                                || 'fixed inset-0 z-[var(--z-modal-backdrop,1040)] bg-black/30'
                            }
                            onClick={onClose}
                        />
                    )}
                    <motion.div
                        key='panel-content'
                        variants={slideRightVariants}
                        initial='hidden'
                        animate='visible'
                        exit='exit'
                        className={className}
                        style={{
                            position: 'fixed',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width,
                            zIndex: 'var(--z-modal, 1050)' as unknown as number,
                            ...style,
                        }}
                        {...props}
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
