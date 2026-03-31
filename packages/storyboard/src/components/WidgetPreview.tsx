import { useEffect, useRef, useState, useCallback } from 'react';
import { mountWidget, type MountResult } from '@perimeter-widgets/shared';
import { ConfigEditor } from '@/components/ConfigEditor';
import type { WidgetDefinition } from '@/registry';

/** Read the current resolved theme from the document element */
function getResolvedTheme(): string {
    return document.documentElement.getAttribute('data-theme') ?? 'light';
}

interface WidgetPreviewProps {
    widget: WidgetDefinition;
}

export function WidgetPreview({ widget }: WidgetPreviewProps) {
    const mountRef = useRef<MountResult | null>(null);
    const [config, setConfig] = useState<
        Record<string, string | number | boolean>
    >(() => getDefaults(widget));
    const [mountKey, setMountKey] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [theme, setTheme] = useState(getResolvedTheme);

    // Watch for theme changes on document element
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setTheme(getResolvedTheme());
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });
        return () => observer.disconnect();
    }, []);

    const handleChange = useCallback(
        (newValues: Record<string, string | number | boolean>) => {
            setConfig(newValues);
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
        setError(null);

        widget
            .load()
            .then(({ component, styles }) => {
                if (cancelled) return;

                mountRef.current = mountWidget({
                    elementId: widget.elementId,
                    component,
                    styles,
                    defaults: config,
                });
            })
            .catch((err) => {
                if (!cancelled) {
                    console.error(
                        `[Storyboard] Failed to load ${widget.name}:`,
                        err,
                    );
                    setError(err instanceof Error ? err.message : String(err));
                }
            });

        return () => {
            cancelled = true;
            mountRef.current?.destroy();
            mountRef.current = null;
        };
    }, [widget, config, mountKey, theme]);

    return (
        <div className='space-y-6'>
            {/* Header */}
            <div>
                <div className='flex items-center gap-3 mb-1'>
                    <h3 className='text-lg font-semibold text-stone-900 dark:text-stone-100'>
                        {widget.name}
                    </h3>
                    <StatusBadge status={widget.status} />
                </div>
                <p className='text-sm text-stone-500 dark:text-stone-400'>
                    {widget.description}
                </p>
            </div>

            {/* Widget preview */}
            <div>
                <div className='flex items-center justify-between mb-2'>
                    <span className='text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider'>
                        Preview
                    </span>
                    <button
                        onClick={() => setMountKey((k) => k + 1)}
                        className='text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors'
                    >
                        Remount
                    </button>
                </div>
                <div className='border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden bg-white dark:bg-stone-900 min-h-[200px]'>
                    {error ?
                        <div className='p-6 text-center'>
                            <p className='text-sm text-red-600 dark:text-red-400 font-medium'>
                                Failed to load widget
                            </p>
                            <p className='text-xs text-stone-500 dark:text-stone-400 mt-1 font-mono'>
                                {error}
                            </p>
                        </div>
                    :   <div
                            key={mountKey}
                            id={widget.elementId}
                            data-theme={theme}
                            {...buildDataAttributes(config)}
                        />
                    }
                </div>
                <p className='text-xs text-stone-400 mt-2'>
                    Element:{' '}
                    <code className='bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded text-stone-600 dark:text-stone-300'>
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
            <div className='border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800'>
                <div className='px-4 py-3 border-b border-stone-200 dark:border-stone-700'>
                    <h4 className='text-sm font-semibold text-stone-800 dark:text-stone-200'>
                        Embed Code
                    </h4>
                </div>
                <pre className='p-4 text-xs text-stone-600 dark:text-stone-300 overflow-x-auto'>
                    {generateEmbedCode(widget, config)}
                </pre>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: WidgetDefinition['status'] }) {
    const colors = {
        ready: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        skeleton:
            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        planned:
            'bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-400',
    };
    return (
        <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status]}`}
        >
            {status}
        </span>
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
