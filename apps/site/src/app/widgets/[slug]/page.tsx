import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { widgetRegistry, getWidget } from '@/lib/widgets-registry';
import { WidgetPreviewClient } from '@/components/widgets/widget-preview-client';

interface PageProps {
    params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
    return widgetRegistry.map((w) => ({ slug: w.id }));
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const widget = getWidget(slug);
    if (!widget) return { title: 'Widget not found' };
    return {
        title: `${widget.name} — Widgets`,
        description: widget.description,
    };
}

export default async function WidgetDetail({ params }: PageProps) {
    const { slug } = await params;
    const widget = getWidget(slug);
    if (!widget) notFound();

    return (
        <div className='mx-auto max-w-5xl px-4 py-10'>
            <nav className='mb-4 text-sm'>
                <Link
                    href='/widgets'
                    className='text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                >
                    ← All widgets
                </Link>
            </nav>

            <header className='mb-6'>
                <h1 className='text-3xl font-bold text-stone-900 dark:text-stone-100'>
                    {widget.name}
                </h1>
                <p className='mt-2 text-stone-600 dark:text-stone-400'>
                    {widget.description}
                </p>
            </header>

            <WidgetPreviewClient widget={widget} />
        </div>
    );
}
