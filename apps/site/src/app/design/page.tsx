import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Design System',
    description:
        'Colors, typography, spacing, borders, and branding for Perimeter Style.',
};

const SECTIONS = [
    {
        href: '/design/colors',
        title: 'Colors',
        description:
            'OKLCH theme tokens grouped by role — primary, feedback, surfaces, charts — with light and dark values.',
    },
    {
        href: '/design/typography',
        title: 'Typography',
        description:
            'Font families, the type scale, line-heights, and tracking.',
    },
    {
        href: '/design/spacing',
        title: 'Spacing',
        description:
            'The spacing scale visualized at every step from 0 to 384px.',
    },
    {
        href: '/design/borders',
        title: 'Borders & Elevation',
        description: 'Radius scale, border widths, focus rings, and shadows.',
    },
    {
        href: '/design/branding',
        title: 'Branding',
        description:
            'Logo marks, brand colors distinct from UI tokens, and usage guidelines.',
    },
] as const;

export default function DesignIndex() {
    return (
        <div className='mx-auto max-w-5xl px-4 py-10'>
            <header className='mb-8'>
                <h1 className='text-3xl font-bold'>Design System</h1>
                <p className='mt-2 text-muted-foreground'>
                    The foundations that every Perimeter component, template,
                    and widget builds on.
                </p>
            </header>

            <ul className='grid gap-4 sm:grid-cols-2'>
                {SECTIONS.map((section) => (
                    <li key={section.href}>
                        <Link
                            href={section.href}
                            className='block rounded-lg border bg-card p-6 hover:border-ring transition-colors'
                        >
                            <h2 className='text-lg font-semibold'>
                                {section.title}
                            </h2>
                            <p className='mt-2 text-sm text-muted-foreground'>
                                {section.description}
                            </p>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
