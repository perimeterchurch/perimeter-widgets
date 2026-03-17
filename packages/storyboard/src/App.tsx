import { useState } from 'react';
import { SermonsPreview } from './previews/sermons';

const widgets = [
    { id: 'sermons', name: 'Sermons', component: SermonsPreview },
] as const;

export function App() {
    const [active, setActive] = useState<string>('sermons');
    const ActiveWidget = widgets.find((w) => w.id === active)?.component;

    return (
        <div className='min-h-screen'>
            {/* Header */}
            <header className='bg-white border-b border-stone-200 px-6 py-4'>
                <h1 className='text-xl font-bold text-stone-900'>
                    Perimeter Widgets — Storyboard
                </h1>
                <p className='text-sm text-stone-500 mt-1'>
                    Preview widgets as they appear on perimeter.org
                </p>
            </header>

            <div className='flex'>
                {/* Sidebar */}
                <nav className='w-56 border-r border-stone-200 bg-white p-4 min-h-[calc(100vh-73px)]'>
                    <h2 className='text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3'>
                        Widgets
                    </h2>
                    <ul className='space-y-1'>
                        {widgets.map((w) => (
                            <li key={w.id}>
                                <button
                                    onClick={() => setActive(w.id)}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                        active === w.id ?
                                            'bg-primary text-white'
                                        :   'text-stone-700 hover:bg-stone-100'
                                    }`}
                                >
                                    {w.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Preview area */}
                <main className='flex-1 p-8'>
                    {ActiveWidget ?
                        <ActiveWidget />
                    :   null}
                </main>
            </div>
        </div>
    );
}
