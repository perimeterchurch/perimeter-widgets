import { useState, useCallback } from 'react';
import {
    isMockActive,
    stopMockWorker,
    startMockWorker,
} from '@/mocks/worker';

export function DataSourceToggle() {
    const [useMocks, setUseMocks] = useState(isMockActive);

    const toggle = useCallback(() => {
        if (useMocks) {
            stopMockWorker();
            setUseMocks(false);
        } else {
            startMockWorker();
            setUseMocks(true);
        }
    }, [useMocks]);

    return (
        <button
            onClick={toggle}
            className='flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors px-2 py-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-700'
            title={useMocks ? 'Using mock data (MSW)' : 'Using real API'}
        >
            <span
                className={`inline-block size-2 rounded-full ${useMocks ? 'bg-amber-500' : 'bg-green-500'}`}
            />
            <span>{useMocks ? 'Mock Data' : 'Live API'}</span>
        </button>
    );
}
