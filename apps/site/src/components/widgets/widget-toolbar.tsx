'use client';

import { useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';

interface WidgetToolbarProps {
    onReload: () => void;
    /** Unix-ms timestamp of the most recent mount */
    lastMountedAt: number;
}

/**
 * Formats a "mounted N seconds ago" string that updates every second.
 * Keeps the render pure by deriving from a ticking `now` state.
 */
function useRelativeTime(timestamp: number): string {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);

    const secondsAgo = Math.max(0, Math.round((now - timestamp) / 1000));
    if (secondsAgo < 2) return 'just now';
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    const minutes = Math.floor(secondsAgo / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
}

export function WidgetToolbar({ onReload, lastMountedAt }: WidgetToolbarProps) {
    const relative = useRelativeTime(lastMountedAt);

    return (
        <div className='flex items-center justify-between rounded-lg border bg-card px-4 py-2'>
            <p className='text-xs text-muted-foreground'>
                Mounted {relative}. Save a widget source file, wait for{' '}
                <code className='text-[11px]'>vite build --watch</code> to
                rebuild, then click Reload to pick up the new bundle.
            </p>
            <button
                type='button'
                onClick={onReload}
                className='inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors'
            >
                <RotateCw className='size-3.5' />
                Reload widget
            </button>
        </div>
    );
}
