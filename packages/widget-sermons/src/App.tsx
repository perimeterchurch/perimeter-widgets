import { useConfig } from '@perimeter-widgets/shared';
import type { SermonsConfig } from './types';

export function SermonsApp() {
    const config = useConfig<SermonsConfig>();

    return (
        <div className='p-4'>
            <h2 className='text-2xl font-bold text-stone-900 mb-4'>Sermons</h2>
            <p className='text-stone-600'>
                Sermons widget is loading. Campus: {config.campus ?? 'all'}
            </p>
            <p className='text-sm text-stone-400 mt-2'>
                This is a placeholder — sermon components will be built once the
                API endpoints are ready.
            </p>
        </div>
    );
}
