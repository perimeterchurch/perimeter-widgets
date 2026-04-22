import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Spacing — Design System',
    description:
        'Tailwind v4 spacing scale — the base unit every margin, padding, gap, width and height derives from.',
};

// Tailwind v4 default spacing scale: --spacing: 0.25rem (4px) base.
// Tokens are multiples of the base, so `p-4` = 16px, `p-8` = 32px, etc.
const SPACING_STEPS = [
    { step: 0, px: 0 },
    { step: 0.5, px: 2 },
    { step: 1, px: 4 },
    { step: 1.5, px: 6 },
    { step: 2, px: 8 },
    { step: 2.5, px: 10 },
    { step: 3, px: 12 },
    { step: 3.5, px: 14 },
    { step: 4, px: 16 },
    { step: 5, px: 20 },
    { step: 6, px: 24 },
    { step: 7, px: 28 },
    { step: 8, px: 32 },
    { step: 9, px: 36 },
    { step: 10, px: 40 },
    { step: 11, px: 44 },
    { step: 12, px: 48 },
    { step: 14, px: 56 },
    { step: 16, px: 64 },
    { step: 20, px: 80 },
    { step: 24, px: 96 },
    { step: 28, px: 112 },
    { step: 32, px: 128 },
    { step: 36, px: 144 },
    { step: 40, px: 160 },
    { step: 48, px: 192 },
    { step: 56, px: 224 },
    { step: 64, px: 256 },
    { step: 72, px: 288 },
    { step: 80, px: 320 },
    { step: 96, px: 384 },
] as const;

export default function SpacingPage() {
    return (
        <div className='mx-auto max-w-5xl px-8 py-10 space-y-8'>
            <header>
                <h1 className='text-3xl font-bold'>Spacing</h1>
                <p className='mt-2 text-muted-foreground'>
                    The base spacing unit is{' '}
                    <code className='text-sm'>0.25rem</code> (4px). All{' '}
                    <code className='text-sm'>p-*</code>,{' '}
                    <code className='text-sm'>m-*</code>,{' '}
                    <code className='text-sm'>gap-*</code>,{' '}
                    <code className='text-sm'>w-*</code>,{' '}
                    <code className='text-sm'>h-*</code> utilities are multiples
                    of this unit.
                </p>
            </header>

            <section className='rounded-lg border bg-card'>
                <div className='grid grid-cols-[80px_80px_1fr] gap-4 px-4 py-3 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    <span>Step</span>
                    <span className='text-right'>Size</span>
                    <span>Visual</span>
                </div>
                <div className='divide-y'>
                    {SPACING_STEPS.map(({ step, px }) => (
                        <div
                            key={step}
                            className='grid grid-cols-[80px_80px_1fr] gap-4 px-4 py-2 items-center'
                        >
                            <code className='text-sm font-mono'>{step}</code>
                            <span className='text-sm font-mono text-muted-foreground text-right'>
                                {px}px
                            </span>
                            <div
                                className='h-4 rounded-sm bg-primary'
                                style={{ width: px === 0 ? '2px' : `${px}px` }}
                                title={`w-${step} / ${px}px`}
                            />
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className='text-xl font-semibold mb-3'>Usage guidance</h2>
                <div className='rounded-lg border bg-card p-5 space-y-3 text-sm'>
                    <p>
                        <strong>Component padding</strong> typically uses 2–6
                        (8–24px) for dense UI, 8 (32px) for comfortable dialogs
                        and cards, 10–16 (40–64px) for marketing surfaces.
                    </p>
                    <p>
                        <strong>Gap between elements</strong> defaults to 2–4
                        (8–16px) for grouped controls, 6–8 (24–32px) for
                        sections.
                    </p>
                    <p>
                        <strong>Icon sizes</strong> use square-only values — 3,
                        4, 5, 6 (12/16/20/24px) are the most common.
                    </p>
                </div>
            </section>
        </div>
    );
}
