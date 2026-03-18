import { motion, type HTMLMotionProps } from 'framer-motion';
import { slideUpVariants } from '../../lib/motion/config';

export interface SlideUpProps extends HTMLMotionProps<'div'> {
    /** Delay before the animation starts (seconds) */
    delay?: number;
}

export function SlideUp({ delay, transition, ...props }: SlideUpProps) {
    return (
        <motion.div
            variants={slideUpVariants}
            initial='hidden'
            animate='visible'
            exit='exit'
            transition={delay ? { ...transition, delay } : transition}
            {...props}
        />
    );
}
