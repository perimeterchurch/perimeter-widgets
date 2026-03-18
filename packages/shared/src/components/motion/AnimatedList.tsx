import {
    AnimatePresence,
    motion,
    type HTMLMotionProps,
    type Variants,
} from 'framer-motion';
import { Children, useMemo, type ReactNode } from 'react';
import {
    staggerItemVariants,
    staggers,
    transitions,
} from '../../lib/motion/config';

export interface AnimatedListProps extends Omit<
    HTMLMotionProps<'div'>,
    'children'
> {
    children: ReactNode;
    /** Delay between each child animation (seconds) */
    staggerDelay?: number;
    /** Custom variants for each list item */
    itemVariants?: Variants;
    /** Render as div, ul, or ol */
    as?: 'div' | 'ul' | 'ol';
}

export function AnimatedList({
    children,
    staggerDelay = staggers.base,
    itemVariants = staggerItemVariants,
    as: Tag = 'div',
    ...props
}: AnimatedListProps) {
    const containerVariants: Variants = useMemo(
        () => ({
            hidden: {},
            visible: {
                transition: {
                    staggerChildren: staggerDelay,
                },
            },
            exit: {
                transition: {
                    staggerChildren: staggerDelay,
                    staggerDirection: -1,
                },
            },
        }),
        [staggerDelay],
    );

    return (
        <motion.div
            role={Tag === 'ul' || Tag === 'ol' ? 'list' : undefined}
            variants={containerVariants}
            initial='hidden'
            animate='visible'
            exit='exit'
            {...props}
        >
            <AnimatePresence>
                {Children.map(children, (child, index) => {
                    if (!child) return null;
                    return (
                        <motion.div
                            key={
                                (child as React.ReactElement)?.key
                                ?? `item-${index}`
                            }
                            role={
                                Tag === 'ul' || Tag === 'ol' ?
                                    'listitem'
                                :   undefined
                            }
                            variants={itemVariants}
                            transition={{
                                ...transitions.base,
                                delay: index * staggerDelay,
                            }}
                        >
                            {child}
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </motion.div>
    );
}
