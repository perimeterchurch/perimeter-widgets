import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Branding — Design System',
    description:
        'Logo marks, brand colors distinct from UI tokens, and usage guidelines.',
};

// Brand palette — kept distinct from UI theme tokens so we can restyle the
// product's surfaces independently of the Perimeter Church master brand.
const BRAND_COLORS = [
    {
        name: 'Primary Purple',
        hex: '#4A3A9A',
        oklch: 'oklch(0.488 0.145 283)',
        usage: 'Primary CTAs, branded moments, the default --color-primary token',
    },
    {
        name: 'Warm Stone 950',
        hex: '#1C1917',
        oklch: 'oklch(0.147 0.012 50)',
        usage: 'Dark-mode background, high-contrast text in light mode',
    },
    {
        name: 'Warm Stone 50',
        hex: '#FAFAF9',
        oklch: 'oklch(0.985 0.002 75)',
        usage: 'Light-mode background, inverted text in dark mode',
    },
    {
        name: 'Chart Green',
        hex: '#4AA16D',
        oklch: 'oklch(0.59 0.16 145)',
        usage: 'Success states, positive metrics, --color-success',
    },
    {
        name: 'Chart Amber',
        hex: '#C9A04A',
        oklch: 'oklch(0.78 0.15 80)',
        usage: 'Warning states, caution metrics, --color-warning',
    },
    {
        name: 'Chart Red',
        hex: '#D54D3F',
        oklch: 'oklch(0.577 0.245 27)',
        usage: 'Destructive actions, error states, --color-destructive',
    },
] as const;

const PLACEHOLDERS = [
    {
        name: 'Primary mark',
        description: 'Full-color logo on light backgrounds',
    },
    { name: 'White mark', description: 'Reversed logo on dark backgrounds' },
    {
        name: 'Monochrome',
        description:
            'Single-color stamp for print, embossing, monochrome contexts',
    },
] as const;

export default function BrandingPage() {
    return (
        <div className='mx-auto max-w-5xl px-8 py-10 space-y-12'>
            <header>
                <h1 className='text-3xl font-bold'>Branding</h1>
                <p className='mt-2 text-muted-foreground'>
                    The Perimeter Church brand identity — kept distinct from UI
                    theme tokens so the product can restyle surfaces without
                    touching the master brand.
                </p>
            </header>

            <section>
                <h2 className='text-xl font-semibold mb-4'>Logo marks</h2>
                <div className='rounded-lg border bg-card p-4 mb-4'>
                    <p className='text-sm text-muted-foreground'>
                        Real brand-mark SVGs will live at{' '}
                        <code className='text-xs'>
                            apps/site/public/brand/*.svg
                        </code>
                        . The placeholders below will be swapped for the real
                        marks in a follow-up; update this page to{' '}
                        <code className='text-xs'>{'<Image src="..."/>'}</code>{' '}
                        when the files land.
                    </p>
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                    {PLACEHOLDERS.map((p) => (
                        <div
                            key={p.name}
                            className='rounded-lg border bg-card overflow-hidden'
                        >
                            <div className='aspect-[4/3] flex items-center justify-center bg-muted text-muted-foreground text-xs border-b'>
                                Placeholder
                            </div>
                            <div className='p-4'>
                                <h3 className='text-sm font-semibold'>
                                    {p.name}
                                </h3>
                                <p className='text-xs text-muted-foreground mt-1'>
                                    {p.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className='text-xl font-semibold mb-4'>Brand palette</h2>
                <div className='rounded-lg border bg-card divide-y'>
                    {BRAND_COLORS.map((c) => (
                        <div
                            key={c.name}
                            className='flex items-center gap-4 p-4'
                        >
                            <div
                                className='h-12 w-12 rounded-md shrink-0 border'
                                style={{ backgroundColor: c.hex }}
                            />
                            <div className='flex-1 min-w-0'>
                                <h3 className='text-sm font-semibold'>
                                    {c.name}
                                </h3>
                                <p className='text-xs text-muted-foreground mt-0.5'>
                                    {c.usage}
                                </p>
                            </div>
                            <div className='text-right shrink-0'>
                                <code className='block text-xs font-mono'>
                                    {c.hex}
                                </code>
                                <code className='block text-xs font-mono text-muted-foreground mt-0.5'>
                                    {c.oklch}
                                </code>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className='text-xl font-semibold mb-4'>Usage guidelines</h2>
                <div className='rounded-lg border bg-card p-6 space-y-4 text-sm'>
                    <div>
                        <h3 className='font-semibold mb-1'>Clearspace</h3>
                        <p className='text-muted-foreground'>
                            Leave at least one mark-height of empty space on
                            every side of the logo. Never crowd with text,
                            photography, or graphics.
                        </p>
                    </div>
                    <div>
                        <h3 className='font-semibold mb-1'>Don&rsquo;t</h3>
                        <ul className='list-disc list-inside space-y-1 text-muted-foreground'>
                            <li>Rotate, skew, or stretch the mark</li>
                            <li>
                                Recolor the primary mark with non-brand colors
                            </li>
                            <li>
                                Apply drop shadows, gradients, or bevels to the
                                mark
                            </li>
                            <li>
                                Place the primary mark on low-contrast or busy
                                backgrounds — use the white or monochrome mark
                                instead
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className='font-semibold mb-1'>Tone</h3>
                        <p className='text-muted-foreground'>
                            Warm, welcoming, deliberate. The brand is a church —
                            communications should feel personal and grounded,
                            not corporate. Prefer sentence case, short
                            sentences, and human verbs.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
