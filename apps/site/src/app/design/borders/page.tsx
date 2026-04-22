import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Borders & Elevation — Design System',
    description:
        'Radius scale, border widths, focus rings, and shadow steps for Perimeter Style.',
};

// Radius scale from apps/site/src/app/globals.css @theme block.
// All derived from --radius (base = 0.625rem / 10px).
const RADIUS_SCALE = [
    { name: '--radius-sm', className: 'rounded-sm', factor: '0.6×', px: '6px' },
    { name: '--radius-md', className: 'rounded-md', factor: '0.8×', px: '8px' },
    { name: '--radius-lg', className: 'rounded-lg', factor: '1×', px: '10px' },
    {
        name: '--radius-xl',
        className: 'rounded-xl',
        factor: '1.4×',
        px: '14px',
    },
    {
        name: '--radius-2xl',
        className: 'rounded-2xl',
        factor: '1.8×',
        px: '18px',
    },
    {
        name: '--radius-3xl',
        className: 'rounded-3xl',
        factor: '2.2×',
        px: '22px',
    },
    {
        name: '--radius-4xl',
        className: 'rounded-4xl',
        factor: '2.6×',
        px: '26px',
    },
    { name: 'rounded-full', className: 'rounded-full', factor: '∞', px: '50%' },
] as const;

const BORDER_WIDTHS = [
    { className: 'border-0', label: 'border-0 (none)' },
    { className: 'border', label: 'border (1px) — default for cards/inputs' },
    { className: 'border-2', label: 'border-2 (2px) — emphasized edges' },
    { className: 'border-4', label: 'border-4 (4px)' },
    { className: 'border-8', label: 'border-8 (8px)' },
] as const;

const SHADOWS = [
    {
        className: 'shadow-sm',
        label: 'shadow-sm',
        usage: 'Subtle lift on hover states',
    },
    {
        className: 'shadow',
        label: 'shadow',
        usage: 'Default card elevation',
    },
    {
        className: 'shadow-md',
        label: 'shadow-md',
        usage: 'Popovers, dropdown menus',
    },
    {
        className: 'shadow-lg',
        label: 'shadow-lg',
        usage: 'Modals, dialogs, hover cards',
    },
    {
        className: 'shadow-xl',
        label: 'shadow-xl',
        usage: 'Floating action buttons, prominent overlays',
    },
    {
        className: 'shadow-2xl',
        label: 'shadow-2xl',
        usage: 'Primary hero CTAs, fullscreen overlays',
    },
] as const;

export default function BordersPage() {
    return (
        <div className='mx-auto max-w-5xl px-8 py-10 space-y-12'>
            <header>
                <h1 className='text-3xl font-bold'>Borders & Elevation</h1>
                <p className='mt-2 text-muted-foreground'>
                    Radius, border widths, and shadow steps. Radius tokens
                    derive from <code className='text-sm'>--radius</code> so
                    themes can retune the entire scale by changing one value.
                </p>
            </header>

            <section>
                <h2 className='text-xl font-semibold mb-4'>Radius</h2>
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
                    {RADIUS_SCALE.map((r) => (
                        <div
                            key={r.name}
                            className='rounded-lg border bg-card p-4 text-center'
                        >
                            <div
                                className={`mx-auto mb-3 h-16 w-16 bg-primary ${r.className}`}
                            />
                            <code className='block text-xs font-mono'>
                                {r.name}
                            </code>
                            <div className='text-xs text-muted-foreground mt-1'>
                                {r.factor} · {r.px}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className='text-xl font-semibold mb-4'>Border widths</h2>
                <div className='rounded-lg border bg-card divide-y'>
                    {BORDER_WIDTHS.map((b) => (
                        <div
                            key={b.className}
                            className='flex items-center gap-6 p-4'
                        >
                            <div
                                className={`h-10 w-10 rounded-md border-foreground ${b.className}`}
                            />
                            <code className='text-sm font-mono text-muted-foreground'>
                                {b.label}
                            </code>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className='text-xl font-semibold mb-4'>Focus ring</h2>
                <div className='rounded-lg border bg-card p-6'>
                    <p className='text-sm text-muted-foreground mb-4'>
                        Interactive elements use a 3px ring at{' '}
                        <code className='text-xs'>--color-ring</code> with 50%
                        opacity. Click or tab to the button below to preview.
                    </p>
                    <button
                        type='button'
                        className='px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring border border-transparent'
                    >
                        Focus me
                    </button>
                </div>
            </section>

            <section>
                <h2 className='text-xl font-semibold mb-4'>Shadows</h2>
                <div className='grid grid-cols-2 sm:grid-cols-3 gap-6'>
                    {SHADOWS.map((s) => (
                        <div key={s.className} className='text-center'>
                            <div
                                className={`mx-auto mb-3 h-24 w-full rounded-lg bg-card border ${s.className}`}
                            />
                            <code className='block text-xs font-mono'>
                                {s.label}
                            </code>
                            <div className='text-xs text-muted-foreground mt-1'>
                                {s.usage}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
