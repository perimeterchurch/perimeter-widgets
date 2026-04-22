import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Typography — Design System',
    description:
        'Font families, the type scale, line-heights, and tracking for Perimeter Style.',
};

interface TypeSample {
    name: string;
    className: string;
    /** Approximate px size — for display only, Tailwind's rem values are source of truth */
    size: string;
    usage: string;
}

const FONT_FAMILIES = [
    {
        token: '--font-sans',
        name: 'Sans (body)',
        description:
            'Default body and heading font. System UI stack for native feel and zero-byte cost.',
        sample: 'The quick brown fox jumps over the lazy dog',
        className: 'font-sans',
    },
    {
        token: '--font-mono',
        name: 'Mono',
        description:
            'Used in code blocks, CSS variable names, and tabular figures.',
        sample: 'const radius = "0.625rem";',
        className: 'font-mono',
    },
    {
        token: '--font-heading',
        name: 'Heading',
        description:
            'Aliases --font-sans today. Override per-theme to give a project its own display face.',
        sample: 'Welcome to Perimeter',
        className: 'font-sans',
    },
] as const;

const TYPE_SCALE: TypeSample[] = [
    {
        name: 'text-xs',
        className: 'text-xs',
        size: '12px',
        usage: 'Captions, data-attribute hints, small helper text',
    },
    {
        name: 'text-sm',
        className: 'text-sm',
        size: '14px',
        usage: 'Default body text, form labels, buttons',
    },
    {
        name: 'text-base',
        className: 'text-base',
        size: '16px',
        usage: 'Prose paragraphs, input content, docs body',
    },
    {
        name: 'text-lg',
        className: 'text-lg',
        size: '18px',
        usage: 'Emphasized body text, card titles',
    },
    {
        name: 'text-xl',
        className: 'text-xl',
        size: '20px',
        usage: 'Section headings, modal titles',
    },
    {
        name: 'text-2xl',
        className: 'text-2xl',
        size: '24px',
        usage: 'Page subsections',
    },
    {
        name: 'text-3xl',
        className: 'text-3xl',
        size: '30px',
        usage: 'Page titles',
    },
    {
        name: 'text-4xl',
        className: 'text-4xl',
        size: '36px',
        usage: 'Hero headings',
    },
    {
        name: 'text-5xl',
        className: 'text-5xl',
        size: '48px',
        usage: 'Landing page hero',
    },
];

const WEIGHTS = [
    { className: 'font-normal', label: '400 Normal' },
    { className: 'font-medium', label: '500 Medium' },
    { className: 'font-semibold', label: '600 Semibold' },
    { className: 'font-bold', label: '700 Bold' },
] as const;

const LINE_HEIGHTS = [
    { className: 'leading-none', label: 'leading-none (1)' },
    { className: 'leading-tight', label: 'leading-tight (1.25)' },
    { className: 'leading-snug', label: 'leading-snug (1.375)' },
    { className: 'leading-normal', label: 'leading-normal (1.5)' },
    { className: 'leading-relaxed', label: 'leading-relaxed (1.625)' },
    { className: 'leading-loose', label: 'leading-loose (2)' },
] as const;

const TRACKING = [
    { className: 'tracking-tighter', label: 'tracking-tighter (-0.05em)' },
    { className: 'tracking-tight', label: 'tracking-tight (-0.025em)' },
    { className: 'tracking-normal', label: 'tracking-normal (0)' },
    { className: 'tracking-wide', label: 'tracking-wide (0.025em)' },
    { className: 'tracking-wider', label: 'tracking-wider (0.05em)' },
    { className: 'tracking-widest', label: 'tracking-widest (0.1em)' },
] as const;

export default function TypographyPage() {
    return (
        <div className='mx-auto max-w-5xl px-8 py-10 space-y-12'>
            <header>
                <h1 className='text-3xl font-bold'>Typography</h1>
                <p className='mt-2 text-muted-foreground'>
                    Font families, type scale, weights, line-heights, and
                    tracking. Tailwind v4 scale — custom values live in{' '}
                    <code className='text-sm'>
                        apps/site/src/app/globals.css
                    </code>
                    .
                </p>
            </header>

            <section>
                <h2 className='text-xl font-semibold mb-4'>Font families</h2>
                <div className='space-y-3'>
                    {FONT_FAMILIES.map((family) => (
                        <div
                            key={family.token}
                            className='rounded-lg border bg-card p-5'
                        >
                            <div className='flex items-baseline justify-between gap-4 mb-2'>
                                <h3 className='text-base font-semibold'>
                                    {family.name}
                                </h3>
                                <code className='text-xs text-muted-foreground font-mono'>
                                    {family.token}
                                </code>
                            </div>
                            <p className='text-sm text-muted-foreground mb-3'>
                                {family.description}
                            </p>
                            <p className={`text-2xl ${family.className}`}>
                                {family.sample}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className='text-xl font-semibold mb-4'>Type scale</h2>
                <div className='rounded-lg border bg-card divide-y'>
                    {TYPE_SCALE.map((sample) => (
                        <div
                            key={sample.name}
                            className='flex items-baseline gap-6 p-4'
                        >
                            <div className='w-28 shrink-0'>
                                <code className='text-xs text-muted-foreground'>
                                    {sample.name}
                                </code>
                                <div className='text-xs text-muted-foreground mt-0.5'>
                                    {sample.size}
                                </div>
                            </div>
                            <div className='flex-1 min-w-0'>
                                <p
                                    className={`${sample.className} truncate`}
                                    title={sample.usage}
                                >
                                    The five boxing wizards jump quickly
                                </p>
                                <p className='text-xs text-muted-foreground mt-1'>
                                    {sample.usage}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className='text-xl font-semibold mb-4'>Weights</h2>
                <div className='rounded-lg border bg-card divide-y'>
                    {WEIGHTS.map((weight) => (
                        <div
                            key={weight.className}
                            className='flex items-baseline gap-6 p-4'
                        >
                            <code className='text-xs text-muted-foreground w-40 shrink-0'>
                                {weight.label}
                            </code>
                            <p className={`text-lg ${weight.className}`}>
                                Perimeter Style — type system
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className='text-xl font-semibold mb-4'>Line height</h2>
                <div className='rounded-lg border bg-card divide-y'>
                    {LINE_HEIGHTS.map((lh) => (
                        <div
                            key={lh.className}
                            className='flex items-start gap-6 p-4'
                        >
                            <code className='text-xs text-muted-foreground w-56 shrink-0 pt-1'>
                                {lh.label}
                            </code>
                            <p className={`text-sm max-w-xl ${lh.className}`}>
                                The design system is the shared vocabulary
                                between designers, engineers, and product —
                                every component, page, and widget pulls from it
                                so that the whole product feels like one
                                coherent thing.
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className='text-xl font-semibold mb-4'>Tracking</h2>
                <div className='rounded-lg border bg-card divide-y'>
                    {TRACKING.map((t) => (
                        <div
                            key={t.className}
                            className='flex items-baseline gap-6 p-4'
                        >
                            <code className='text-xs text-muted-foreground w-64 shrink-0'>
                                {t.label}
                            </code>
                            <p className={`text-lg ${t.className}`}>
                                PERIMETER STYLE
                            </p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
