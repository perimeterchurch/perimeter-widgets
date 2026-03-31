import { useState, useCallback } from 'react';
import {
    shouldUseMocks,
    stopMockWorker,
    startMockWorker,
} from '@/mocks/worker';

export function DataSourceToggle() {
    const [useMocks, setUseMocks] = useState(shouldUseMocks);
    const [switching, setSwitching] = useState(false);

    const toggle = useCallback(async () => {
        setSwitching(true);
        if (useMocks) {
            await stopMockWorker();
            setUseMocks(false);
        } else {
            await startMockWorker();
            setUseMocks(true);
        }
        // Reload to clear cached query data and reset service worker state
        window.location.reload();
    }, [useMocks]);

    return (
        <button
            onClick={toggle}
            disabled={switching}
            className='flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors px-2 py-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-50'
            title={useMocks ? 'Using mock data (MSW)' : 'Using real API'}
        >
            <span
                className={`inline-block size-2 rounded-full ${useMocks ? 'bg-amber-500' : 'bg-green-500'}`}
            />
            <span>
                {switching ? 'Switching...' : useMocks ? 'Mock Data' : 'Live API'}
            </span>
        </button>
    );
}
