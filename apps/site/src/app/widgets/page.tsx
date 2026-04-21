import type { Metadata } from 'next';
import Link from 'next/link';
import { widgetRegistry } from '@/lib/widgets-registry';

export const metadata: Metadata = {
    title: 'Widgets',
    description:
        'Preview, configure, and embed Perimeter widgets for perimeter.org.',
};

const statusLabel = {
    ready: 'Ready',
    skeleton: 'In progress',
    planned: 'Planned',
} as const;

const statusStyles = {
    ready: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
    skeleton:
        'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    planned:
        'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
} as const;

export default function WidgetsIndex() {
    return (
        <div className='mx-auto max-w-4xl px-4 py-10'>
            <header className='mb-8'>
                <h1 className='text-3xl font-bold text-stone-900 dark:text-stone-100'>
                    Widgets
                </h1>
                <p className='mt-2 text-stone-600 dark:text-stone-400'>
                    Self-contained React widgets for embedding on{' '}
                    <a href='https://perimeter.org' className='underline'>
                        perimeter.org
                    </a>
                    . Each preview runs the same IIFE bundle served via
                    jsDelivr, so what you see here is exactly what your page
                    will render.
                </p>
            </header>

            <ul className='grid gap-4 sm:grid-cols-2'>
                {widgetRegistry.map((widget) => (
                    <li key={widget.id}>
                        <Link
                            href={`/widgets/${widget.id}`}
                            className='block rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-5 hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors'
                        >
                            <div className='flex items-start justify-between gap-3'>
                                <h2 className='text-lg font-semibold text-stone-900 dark:text-stone-100'>
                                    {widget.name}
                                </h2>
                                <span
                                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[widget.status]}`}
                                >
                                    {statusLabel[widget.status]}
                                </span>
                            </div>
                            <p className='mt-2 text-sm text-stone-600 dark:text-stone-400'>
                                {widget.description}
                            </p>
                            <p className='mt-3 text-xs text-stone-400 font-mono'>
                                {widget.configFields.length} configurable{' '}
                                {widget.configFields.length === 1 ?
                                    'field'
                                :   'fields'}
                            </p>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
