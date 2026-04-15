import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function getStoredTheme(): Theme {
    const stored = localStorage.getItem('storyboard-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return 'light';
}

function applyTheme(theme: Theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    // Propagate data-theme for shadow DOM widgets (they use @custom-variant dark
    // which matches [data-theme="dark"], not the .dark class)
    document.documentElement.setAttribute('data-theme', theme);
}

export function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>(getStoredTheme);

    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem('storyboard-theme', theme);
    }, [theme]);

    return (
        <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className='flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors px-2 py-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-700'
            title={`Theme: ${theme}`}
        >
            <span>{theme === 'light' ? '☀️' : '🌙'}</span>
            <span className='capitalize'>{theme}</span>
        </button>
    );
}
