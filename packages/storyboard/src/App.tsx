import { useState } from 'react';
import { widgetRegistry } from '@/registry';
import { WidgetPreview } from '@/components/WidgetPreview';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DataSourceToggle } from '@/components/DataSourceToggle';

const statusIcons = {
    ready: '●',
    skeleton: '◐',
    planned: '○',
} as const;

const statusColors = {
    ready: 'text-green-500',
    skeleton: 'text-amber-500',
    planned: 'text-stone-400',
} as const;

export function App() {
    const [activeId, setActiveId] = useState(widgetRegistry[0]?.id ?? '');
    const activeWidget = widgetRegistry.find((w) => w.id === activeId);

    return (
        <div className='min-h-screen bg-stone-50 dark:bg-stone-950 transition-colors'>
            {/* Header */}
            <header className='fixed top-0 left-0 right-0 z-20 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-6 py-4'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                        <h1 className='text-xl font-bold text-stone-900 dark:text-stone-100'>
                            Perimeter Widgets
                        </h1>
                        <span className='text-xs bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 px-2 py-0.5 rounded-full font-medium'>
                            Storyboard
                        </span>
                    </div>
                    <div className='flex items-center gap-2'>
                        <DataSourceToggle />
                        <ThemeToggle />
                    </div>
                </div>
                <p className='text-sm text-stone-500 dark:text-stone-400 mt-1'>
                    Preview and configure widgets as they appear on
                    perimeter.org
                </p>
            </header>

            <div className='pt-[73px]'>
                {/* Sidebar — fixed */}
                <nav className='fixed top-[73px] left-0 bottom-0 w-64 z-10 border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-y-auto'>
                    <div className='p-4'>
                        <h2 className='text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3'>
                            Widgets
                        </h2>
                        <ul className='space-y-1'>
                            {widgetRegistry.map((w) => (
                                <li key={w.id}>
                                    <button
                                        onClick={() => setActiveId(w.id)}
                                        className={[
                                            'w-full text-left px-3 py-2.5 rounded-lg transition-colors',
                                            activeId === w.id ?
                                                'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800'
                                            :   'hover:bg-stone-50 dark:hover:bg-stone-800',
                                        ].join(' ')}
                                    >
                                        <div className='flex items-center gap-2'>
                                            <span
                                                className={`text-xs ${statusColors[w.status]}`}
                                                title={w.status}
                                            >
                                                {statusIcons[w.status]}
                                            </span>
                                            <span
                                                className={`text-sm font-medium ${
                                                    activeId === w.id ?
                                                        'text-indigo-900 dark:text-indigo-200'
                                                    :   'text-stone-800 dark:text-stone-200'
                                                }`}
                                            >
                                                {w.name}
                                            </span>
                                        </div>
                                        <p className='text-xs text-stone-400 mt-0.5 ml-5 line-clamp-2'>
                                            {w.description}
                                        </p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legend */}
                    <div className='px-4 py-3 border-t border-stone-100 dark:border-stone-800 mt-auto'>
                        <h3 className='text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2'>
                            Status
                        </h3>
                        <ul className='space-y-1'>
                            {(
                                Object.entries(statusIcons) as [
                                    keyof typeof statusIcons,
                                    string,
                                ][]
                            ).map(([status, icon]) => (
                                <li
                                    key={status}
                                    className='flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400'
                                >
                                    <span className={statusColors[status]}>
                                        {icon}
                                    </span>
                                    <span className='capitalize'>{status}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </nav>

                {/* Preview area — offset by sidebar width */}
                <main className='ml-64 flex-1 min-w-0 p-8'>
                    {activeWidget ?
                        <WidgetPreview
                            key={activeWidget.id}
                            widget={activeWidget}
                        />
                    :   <div className='text-center text-stone-400 py-20'>
                            Select a widget from the sidebar
                        </div>
                    }
                </main>
            </div>
        </div>
    );
}
