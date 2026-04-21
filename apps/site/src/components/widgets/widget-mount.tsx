'use client';

import { useEffect, useRef } from 'react';
import type { WidgetDefinition } from '@/lib/widgets-registry';
import { configToDataAttrs } from '@/lib/data-attrs';

interface WidgetMountProps {
    widget: WidgetDefinition;
    config: Record<string, string | number | boolean>;
    /** Bump to force a fresh mount (e.g., after config is applied) */
    mountKey: number;
}

/**
 * Mounts a widget by rendering its target <div> and injecting the IIFE bundle.
 * The widget's own script calls mountWidget() and attaches a shadow root to the div.
 *
 * When mountKey changes we tear down the div and re-add a fresh <script> tag; the
 * IIFE re-runs against the new div, giving the widget clean state with the new
 * data-* attributes.
 */
export function WidgetMount({ widget, config, mountKey }: WidgetMountProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Inject the widget IIFE. The widget auto-mounts via its mountWidget() call.
        // Adding a cache-busting query so repeated mounts during dev pick up the
        // freshly rebuilt bundle instead of a stale one.
        const script = document.createElement('script');
        script.src = `/widget-bundles/${widget.id}.js?t=${mountKey}`;
        script.async = true;
        document.body.appendChild(script);

        return () => {
            script.remove();
            // Clear any shadow root the widget attached so the next mount is clean.
            const host = document.getElementById(widget.elementId);
            if (host?.shadowRoot) host.shadowRoot.innerHTML = '';
        };
    }, [widget.id, widget.elementId, mountKey]);

    const attrs = configToDataAttrs(config);

    return (
        <div
            ref={containerRef}
            className='rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 min-h-[400px]'
        >
            <div id={widget.elementId} key={mountKey} {...attrs} />
        </div>
    );
}
