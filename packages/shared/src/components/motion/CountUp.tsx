import { useSpring, useTransform, type SpringOptions } from 'framer-motion';
import { useEffect, useRef } from 'react';

export interface CountUpProps {
    /** Target number value */
    value: number;
    /** Spring configuration for the animation */
    springConfig?: SpringOptions;
    /** Format function for the displayed number */
    format?: (value: number) => string;
    /** Additional class names */
    className?: string;
}

const defaultFormat = (v: number) => Math.round(v).toLocaleString();

export function CountUp({
    value,
    springConfig = { stiffness: 200, damping: 20 },
    format = defaultFormat,
    className,
}: CountUpProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useSpring(0, springConfig);
    const display = useTransform(motionValue, (latest) => format(latest));

    useEffect(() => {
        motionValue.set(value);
    }, [value, motionValue]);

    useEffect(() => {
        const unsubscribe = display.on('change', (latest) => {
            if (ref.current) {
                ref.current.textContent = latest;
            }
        });
        return unsubscribe;
    }, [display]);

    return <span ref={ref} className={className} />;
}
