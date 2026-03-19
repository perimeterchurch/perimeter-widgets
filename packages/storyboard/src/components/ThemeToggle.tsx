import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

function getSystemPreference(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ?
            'dark'
        :   'light';
}

function getStoredTheme(): Theme {
    const stored = localStorage.getItem('storyboard-theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system')
        return stored;
    return 'system';
}

function applyTheme(theme: Theme) {
    const resolved = theme === 'system' ? getSystemPreference() : theme;
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    // Propagate data-theme for shadow DOM widgets (they use @custom-variant dark
    // which matches [data-theme="dark"], not the .dark class)
    document.documentElement.setAttribute(
        'data-theme',
        resolved === 'dark' ? 'dark' : 'light',
    );
}

export function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>(getStoredTheme);

    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem('storyboard-theme', theme);
    }, [theme]);

    // Listen for system preference changes when in 'system' mode
    useEffect(() => {
        if (theme !== 'system') return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => applyTheme('system');
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [theme]);

    const icons = { light: '☀️', dark: '🌙', system: '💻' } as const;
    const nextTheme: Record<Theme, Theme> = {
        light: 'dark',
        dark: 'system',
        system: 'light',
    };

    return (
        <button
            onClick={() => setTheme(nextTheme[theme])}
            className='flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors px-2 py-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-700'
            title={`Theme: ${theme}`}
        >
            <span>{icons[theme]}</span>
            <span className='capitalize'>{theme}</span>
        </button>
    );
}
