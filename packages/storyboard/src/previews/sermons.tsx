import { useEffect, useRef } from 'react';
import { mountWidget, type MountResult } from '@perimeter-widgets/shared';

export function SermonsPreview() {
    const mountRef = useRef<MountResult | null>(null);

    useEffect(() => {
        // Dynamically import and mount the widget after target element renders
        import('@perimeter-widgets/widget-sermons/app').then(
            ({ SermonsApp }) => {
                import('@perimeter-widgets/widget-sermons/styles?inline').then(
                    (styles) => {
                        mountRef.current = mountWidget({
                            elementId: 'perimeter-sermons',
                            component: SermonsApp,
                            styles: styles.default,
                            defaults: { perPage: 12 },
                        });
                    },
                );
            },
        );

        return () => {
            // Cleanup on unmount (handles StrictMode double-mount in dev)
            mountRef.current?.destroy();
            mountRef.current = null;
        };
    }, []);

    return (
        <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-stone-800'>
                Sermons Widget
            </h3>
            <p className='text-sm text-stone-500'>
                This preview mounts the sermons widget inside a shadow DOM
                container, exactly as it would appear on perimeter.org.
            </p>
            <div className='border border-stone-200 rounded-lg overflow-hidden'>
                <div
                    id='perimeter-sermons'
                    data-campus='buckhead'
                    data-per-page='12'
                />
            </div>
            <p className='text-xs text-stone-400'>
                Element: <code>#perimeter-sermons</code> | Config:
                campus=buckhead, perPage=12
            </p>
        </div>
    );
}
