import { useState } from 'react';
import { widgetRegistry } from '@/registry';
import { WidgetPreview } from '@/components/WidgetPreview';

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
        <div className='min-h-screen'>
            {/* Header */}
            <header className='bg-white border-b border-stone-200 px-6 py-4'>
                <div className='flex items-center gap-3'>
                    <h1 className='text-xl font-bold text-stone-900'>
                        Perimeter Widgets
                    </h1>
                    <span className='text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-medium'>
                        Storyboard
                    </span>
                </div>
                <p className='text-sm text-stone-500 mt-1'>
                    Preview and configure widgets as they appear on
                    perimeter.org
                </p>
            </header>

            <div className='flex'>
                {/* Sidebar */}
                <nav className='w-64 border-r border-stone-200 bg-white min-h-[calc(100vh-73px)]'>
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
                                            activeId === w.id
                                                ? 'bg-indigo-50 border border-indigo-200'
                                                : 'hover:bg-stone-50',
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
                                                    activeId === w.id
                                                        ? 'text-indigo-900'
                                                        : 'text-stone-800'
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
                    <div className='px-4 py-3 border-t border-stone-100 mt-auto'>
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
                                    className='flex items-center gap-2 text-xs text-stone-500'
                                >
                                    <span className={statusColors[status]}>
                                        {icon}
                                    </span>
                                    <span className='capitalize'>
                                        {status}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </nav>

                {/* Preview area */}
                <main className='flex-1 p-8 max-w-4xl'>
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
