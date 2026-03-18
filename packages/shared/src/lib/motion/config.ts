import type { Transition, Variants } from 'framer-motion';

// ---------------------------------------------------------------------------
// Spring presets
// ---------------------------------------------------------------------------

export const springs = {
    snappy: { type: 'spring' as const, stiffness: 500, damping: 30 },
    gentle: { type: 'spring' as const, stiffness: 200, damping: 20 },
    bouncy: { type: 'spring' as const, stiffness: 300, damping: 15 },
};

// ---------------------------------------------------------------------------
// Duration presets (seconds)
// ---------------------------------------------------------------------------

export const durations = {
    fast: 0.15,
    base: 0.2,
    slow: 0.3,
    entrance: 0.4,
};

// ---------------------------------------------------------------------------
// Easing curves (cubic-bezier)
// ---------------------------------------------------------------------------

export const easings = {
    easeOut: [0.16, 1, 0.3, 1] as const,
    easeInOut: [0.4, 0, 0.2, 1] as const,
};

// ---------------------------------------------------------------------------
// Stagger configs (seconds between children)
// ---------------------------------------------------------------------------

export const staggers = {
    fast: 0.03,
    base: 0.05,
    slow: 0.08,
};

// ---------------------------------------------------------------------------
// Transition presets
// ---------------------------------------------------------------------------

export const transitions = {
    /** Quick tween for micro-interactions */
    fast: {
        duration: durations.fast,
        ease: easings.easeOut,
    } satisfies Transition,

    /** Default tween for most animations */
    base: {
        duration: durations.base,
        ease: easings.easeOut,
    } satisfies Transition,

    /** Slower tween for emphasis */
    slow: {
        duration: durations.slow,
        ease: easings.easeOut,
    } satisfies Transition,

    /** Entrance animation with gentle easing */
    entrance: {
        duration: durations.entrance,
        ease: easings.easeOut,
    } satisfies Transition,

    /** Snappy spring for interactive feedback */
    snappy: springs.snappy satisfies Transition,

    /** Gentle spring for layout shifts */
    gentle: springs.gentle satisfies Transition,

    /** Bouncy spring for playful elements */
    bouncy: springs.bouncy satisfies Transition,
};

// ---------------------------------------------------------------------------
// Variant presets
// ---------------------------------------------------------------------------

export const fadeVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: transitions.base,
    },
    exit: {
        opacity: 0,
        transition: transitions.fast,
    },
};

export const slideUpVariants: Variants = {
    hidden: { opacity: 0, y: 6 },
    visible: {
        opacity: 1,
        y: 0,
        transition: transitions.base,
    },
    exit: {
        opacity: 0,
        y: 6,
        transition: transitions.fast,
    },
};

export const slideDownVariants: Variants = {
    hidden: { opacity: 0, y: -6 },
    visible: {
        opacity: 1,
        y: 0,
        transition: transitions.base,
    },
    exit: {
        opacity: 0,
        y: -6,
        transition: transitions.fast,
    },
};

export const scaleInVariants: Variants = {
    hidden: { opacity: 0, scale: 0.97 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: transitions.base,
    },
    exit: {
        opacity: 0,
        scale: 0.97,
        transition: transitions.fast,
    },
};

export const slideRightVariants: Variants = {
    hidden: { x: '100%' },
    visible: {
        x: 0,
        transition: transitions.snappy,
    },
    exit: {
        x: '100%',
        transition: transitions.base,
    },
};

export const slideLeftVariants: Variants = {
    hidden: { x: '-100%' },
    visible: {
        x: 0,
        transition: transitions.snappy,
    },
    exit: {
        x: '-100%',
        transition: transitions.base,
    },
};

/**
 * Directional page slide for multi-page modals/panels.
 * Pass `custom` as 1 (forward) or -1 (back) to control direction.
 */
export const pageSlideVariants: Variants = {
    enter: (dir: number) => ({
        x: dir * 80,
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
        transition: {
            duration: durations.base,
            ease: easings.easeInOut,
        },
    },
    exit: (dir: number) => ({
        x: dir * -80,
        opacity: 0,
        transition: {
            duration: durations.fast,
            ease: easings.easeInOut,
        },
    }),
};

// ---------------------------------------------------------------------------
// Overlay-specific variants
// ---------------------------------------------------------------------------

export const modalBackdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: durations.base, ease: easings.easeOut },
    },
    exit: {
        opacity: 0,
        transition: { duration: durations.fast, ease: easings.easeOut },
    },
};

export const modalPanelVariants: Variants = {
    hidden: { opacity: 0, scale: 0.97, y: 8 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: transitions.base,
    },
    exit: {
        opacity: 0,
        scale: 0.97,
        y: 8,
        transition: transitions.fast,
    },
};

/**
 * Creates a stagger container variant.
 * Children using `staggerItemVariants` will animate in sequence.
 */
export function staggerContainer(
    staggerDelay: number = staggers.base,
): Variants {
    return {
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
    };
}

export const staggerItemVariants: Variants = {
    hidden: { opacity: 0, y: 4 },
    visible: {
        opacity: 1,
        y: 0,
        transition: transitions.base,
    },
    exit: {
        opacity: 0,
        y: 4,
        transition: transitions.fast,
    },
};
