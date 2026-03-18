import { motion, type HTMLMotionProps } from 'framer-motion';
import { fadeVariants } from '../../lib/motion/config';

export interface FadeInProps extends HTMLMotionProps<'div'> {
    /** Delay before the animation starts (seconds) */
    delay?: number;
}

export function FadeIn({ delay, transition, ...props }: FadeInProps) {
    return (
        <motion.div
            variants={fadeVariants}
            initial='hidden'
            animate='visible'
            exit='exit'
            transition={delay ? { ...transition, delay } : transition}
            {...props}
        />
    );
}
