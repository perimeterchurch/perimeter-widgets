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

    const Container =
        Tag === 'ul' ? motion.ul
        : Tag === 'ol' ? motion.ol
        : motion.div;
    const Item = Tag === 'ul' || Tag === 'ol' ? motion.li : motion.div;

    return (
        <Container
            variants={containerVariants}
            initial='hidden'
            animate='visible'
            exit='exit'
            {...(props as Record<string, unknown>)}
        >
            <AnimatePresence>
                {Children.map(children, (child, index) => {
                    if (!child) return null;
                    return (
                        <Item
                            key={
                                (child as React.ReactElement)?.key
                                ?? `item-${index}`
                            }
                            variants={itemVariants}
                            transition={{
                                ...transitions.base,
                                delay: index * staggerDelay,
                            }}
                        >
                            {child}
                        </Item>
                    );
                })}
            </AnimatePresence>
        </Container>
    );
}
