import { motion, type HTMLMotionProps } from 'framer-motion';
import { scaleInVariants } from '../../lib/motion/config';

export interface ScaleInProps extends HTMLMotionProps<'div'> {
    /** Delay before the animation starts (seconds) */
    delay?: number;
}

export function ScaleIn({ delay, transition, ...props }: ScaleInProps) {
    return (
        <motion.div
            variants={scaleInVariants}
            initial='hidden'
            animate='visible'
            exit='exit'
            transition={delay ? { ...transition, delay } : transition}
            {...props}
        />
    );
}
