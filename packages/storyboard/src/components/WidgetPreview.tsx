import { useEffect, useRef, useState, useCallback } from 'react';
import { mountWidget, type MountResult } from '@perimeter-widgets/shared';
import { ConfigEditor } from '@/components/ConfigEditor';
import type { WidgetDefinition } from '@/registry';

interface WidgetPreviewProps {
    widget: WidgetDefinition;
}

export function WidgetPreview({ widget }: WidgetPreviewProps) {
    const mountRef = useRef<MountResult | null>(null);
    const [config, setConfig] = useState<
        Record<string, string | number | boolean>
    >(() => getDefaults(widget));
    const [mountKey, setMountKey] = useState(0);

    const handleChange = useCallback(
        (key: string, value: string | number | boolean) => {
            setConfig((prev) => ({ ...prev, [key]: value }));
        },
        [],
    );

    const handleReset = useCallback(() => {
        setConfig(getDefaults(widget));
        setMountKey((k) => k + 1);
    }, [widget]);

    // Re-mount widget when config changes
    useEffect(() => {
        let cancelled = false;

        Promise.all([
            import(/* @vite-ignore */ widget.imports.app),
            import(/* @vite-ignore */ widget.imports.styles),
        ])
            .then(([appModule, stylesModule]) => {
                if (cancelled) return;

                // Find the exported component (first exported function/component)
                const Component =
                    appModule.default || Object.values(appModule)[0];
                if (!Component) {
                    console.error(
                        `[Storyboard] No component found in ${widget.imports.app}`,
                    );
                    return;
                }

                mountRef.current = mountWidget({
                    elementId: widget.elementId,
                    component: Component as React.ComponentType,
                    styles: stylesModule.default || '',
                    defaults: config,
                });
            })
            .catch((err) => {
                if (!cancelled)
                    console.error(
                        `[Storyboard] Failed to load ${widget.name}:`,
                        err,
                    );
            });

        return () => {
            cancelled = true;
            mountRef.current?.destroy();
            mountRef.current = null;
        };
    }, [widget, config, mountKey]);

    const statusColors = {
        ready: 'bg-green-100 text-green-700',
        skeleton: 'bg-amber-100 text-amber-700',
        planned: 'bg-stone-100 text-stone-500',
    };

    return (
        <div className='space-y-6'>
            {/* Header */}
            <div>
                <div className='flex items-center gap-3 mb-1'>
                    <h3 className='text-lg font-semibold text-stone-900'>
                        {widget.name}
                    </h3>
                    <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[widget.status]}`}
                    >
                        {widget.status}
                    </span>
                </div>
                <p className='text-sm text-stone-500'>{widget.description}</p>
            </div>

            {/* Widget preview */}
            <div>
                <div className='flex items-center justify-between mb-2'>
                    <span className='text-xs font-medium text-stone-500 uppercase tracking-wider'>
                        Preview
                    </span>
                    <button
                        onClick={() => setMountKey((k) => k + 1)}
                        className='text-xs text-indigo-600 hover:text-indigo-700 transition-colors'
                    >
                        Remount
                    </button>
                </div>
                <div className='border border-stone-200 rounded-lg overflow-hidden bg-white min-h-[200px]'>
                    <div
                        key={mountKey}
                        id={widget.elementId}
                        {...buildDataAttributes(config)}
                    />
                </div>
                <p className='text-xs text-stone-400 mt-2'>
                    Element:{' '}
                    <code className='bg-stone-100 px-1 py-0.5 rounded'>
                        #{widget.elementId}
                    </code>
                </p>
            </div>

            {/* Config editor */}
            {widget.configFields.length > 0 && (
                <ConfigEditor
                    fields={widget.configFields}
                    values={config}
                    onChange={handleChange}
                    onReset={handleReset}
                />
            )}

            {/* Embed code */}
            <div className='border border-stone-200 rounded-lg bg-white'>
                <div className='px-4 py-3 border-b border-stone-200'>
                    <h4 className='text-sm font-semibold text-stone-800'>
                        Embed Code
                    </h4>
                </div>
                <pre className='p-4 text-xs text-stone-600 overflow-x-auto'>
                    {generateEmbedCode(widget, config)}
                </pre>
            </div>
        </div>
    );
}

function getDefaults(
    widget: WidgetDefinition,
): Record<string, string | number | boolean> {
    const defaults: Record<string, string | number | boolean> = {};
    for (const field of widget.configFields) {
        defaults[field.key] = field.defaultValue;
    }
    return defaults;
}

function buildDataAttributes(
    config: Record<string, string | number | boolean>,
): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (const [key, value] of Object.entries(config)) {
        if (value === '' || value === false) continue;
        const attr = `data-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
        attrs[attr] = String(value);
    }
    return attrs;
}

function generateEmbedCode(
    widget: WidgetDefinition,
    config: Record<string, string | number | boolean>,
): string {
    const attrs = Object.entries(config)
        .filter(([, v]) => v !== '' && v !== false)
        .map(([k, v]) => {
            const attr = k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
            return `data-${attr}="${v}"`;
        })
        .join(' ');

    const attrStr = attrs ? ` ${attrs}` : '';
    return `<div id="${widget.elementId}"${attrStr}></div>\n<script src="https://cdn.jsdelivr.net/gh/PerimeterChurch/perimeter-widgets@latest/dist/${widget.id}/${widget.id}.js"></script>`;
}
